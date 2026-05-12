"""TiffinFlow FastAPI backend."""
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional, Literal, Any

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from auth_utils import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
    set_auth_cookies, clear_auth_cookies,
)
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest,
)

# Web push
import json as _json
import base64
from py_vapid import Vapid
from pywebpush import webpush, WebPushException
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.backends import default_backend

# ---------- DB Setup ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------- App ----------
app = FastAPI(title="TiffinFlow API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tiffinflow")


# ============================================================
# Models
# ============================================================
class RegisterBody(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address_summary: Optional[str] = None
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None
    dietary_tags: Optional[List[str]] = None


class SubscribeBody(BaseModel):
    plan_id: str
    payment_mode: Literal["wallet", "stripe", "cod"]
    origin_url: Optional[str] = None


class OrderBody(BaseModel):
    menu_date: str  # YYYY-MM-DD
    payment_mode: Literal["wallet", "stripe", "cod"]
    address: Optional[str] = None
    origin_url: Optional[str] = None
    notes: Optional[str] = None


class PauseBody(BaseModel):
    subscription_id: str
    date: str  # YYYY-MM-DD


class WalletRechargeBody(BaseModel):
    amount: float
    origin_url: str


class MenuBody(BaseModel):
    date: str
    main_dish: str
    sides: List[str] = []
    nutrition: dict = {}
    is_special: bool = False
    image_url: Optional[str] = None
    tags: List[str] = []


class PlanBody(BaseModel):
    name: str
    description: str
    meal_count: int
    price: float
    validity_days: int
    badge: Optional[str] = None


class DeliveryStatusBody(BaseModel):
    order_id: str
    status: Literal["preparing", "out_for_delivery", "delivered"]
    otp: Optional[str] = None


# ============================================================
# Auth helpers
# ============================================================
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt_exc():
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def jwt_exc():
    import jwt
    return (jwt.ExpiredSignatureError, jwt.InvalidTokenError)


async def require_role(role: str, user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != role and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return user


# ============================================================
# AUTH ROUTES
# ============================================================
@api.post("/auth/register")
async def register(body: RegisterBody, response: Response):
    email = body.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(body.password),
        "full_name": body.full_name,
        "phone": body.phone,
        "role": "customer",
        "address_summary": None,
        "geo_lat": None,
        "geo_lng": None,
        "dietary_tags": [],
        "wallet_balance": 100.0,  # welcome credit
        "onboarded": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    # welcome credit transaction
    await db.wallet_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "credit",
        "amount": 100.0,
        "source": "welcome_bonus",
        "note": "Welcome bonus credit",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    access = create_access_token(user_id, email, "customer")
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"user": user, "access_token": access}


MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


async def _check_lockout(identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    if not rec:
        return
    locked_until = rec.get("locked_until")
    if locked_until:
        lt = datetime.fromisoformat(locked_until)
        if lt > datetime.now(timezone.utc):
            mins = int((lt - datetime.now(timezone.utc)).total_seconds() // 60) + 1
            raise HTTPException(status_code=429, detail=f"Too many failed attempts. Try again in {mins} minute(s).")


async def _record_failure(identifier: str):
    now = datetime.now(timezone.utc)
    rec = await db.login_attempts.find_one({"identifier": identifier})
    fails = (rec or {}).get("failures", 0) + 1
    upd = {"failures": fails, "last_at": now.isoformat()}
    if fails >= MAX_LOGIN_ATTEMPTS:
        upd["locked_until"] = (now + timedelta(minutes=LOCKOUT_MINUTES)).isoformat()
        upd["failures"] = 0
    await db.login_attempts.update_one(
        {"identifier": identifier}, {"$set": upd}, upsert=True
    )


async def _clear_attempts(identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})


@api.post("/auth/login")
async def login(body: LoginBody, request: Request, response: Response):
    email = body.email.lower()
    # Per-email identifier (proxies rotate client IPs, so IP-based keying is bypassable)
    identifier = f"email:{email}"
    await _check_lockout(identifier)
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        await _record_failure(identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await _clear_attempts(identifier)
    access = create_access_token(user["id"], user["email"], user["role"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"user": user, "access_token": access}


@api.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.patch("/auth/profile")
async def update_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    if body.dietary_tags is not None or body.address_summary is not None:
        await db.users.update_one({"id": user["id"]}, {"$set": {"onboarded": True}})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return fresh


# ============================================================
# MENU ROUTES
# ============================================================
@api.get("/menu/week")
async def get_week_menu(user: dict = Depends(get_current_user)):
    today = date.today()
    start = today - timedelta(days=today.weekday())  # Monday
    days = [(start + timedelta(days=i)).isoformat() for i in range(7)]
    items = await db.daily_menu.find({"date": {"$in": days}}, {"_id": 0}).to_list(20)
    menu_map = {m["date"]: m for m in items}
    result = []
    for d in days:
        if d in menu_map:
            result.append(menu_map[d])
        else:
            result.append({
                "date": d, "main_dish": "Menu coming soon", "sides": [],
                "nutrition": {}, "is_special": False, "image_url": None, "tags": [],
            })
    return result


@api.get("/menu/today")
async def menu_today(user: dict = Depends(get_current_user)):
    today = date.today().isoformat()
    item = await db.daily_menu.find_one({"date": today}, {"_id": 0})
    if not item:
        return {"date": today, "main_dish": "Chef's special tiffin", "sides": ["Rice", "Dal"],
                "nutrition": {"calories": 650}, "is_special": False, "image_url": None, "tags": ["veg"]}
    return item


# ============================================================
# PLANS
# ============================================================
@api.get("/plans")
async def list_plans():
    plans = await db.subscription_plans.find({}, {"_id": 0}).to_list(50)
    return plans


# ============================================================
# SUBSCRIPTIONS
# ============================================================
@api.post("/subscriptions/subscribe")
async def subscribe(body: SubscribeBody, request: Request, user: dict = Depends(get_current_user)):
    plan = await db.subscription_plans.find_one({"id": body.plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if body.payment_mode == "cod":
        settings = await get_settings()
        if not settings.get("cod_enabled", True):
            raise HTTPException(status_code=400, detail="Cash on delivery is currently disabled")

    if body.payment_mode == "wallet":
        if user.get("wallet_balance", 0) < plan["price"]:
            raise HTTPException(status_code=400, detail="Insufficient wallet balance")
        await db.users.update_one({"id": user["id"]}, {"$inc": {"wallet_balance": -plan["price"]}})
        await db.wallet_transactions.insert_one({
            "id": str(uuid.uuid4()), "user_id": user["id"], "type": "debit",
            "amount": plan["price"], "source": "subscription",
            "note": f"Subscribed to {plan['name']}",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        sub = await _activate_subscription(user["id"], plan)
        await create_notification(user["id"], "Subscription activated 🎉",
                                  f"{plan['name']} starts today. Enjoy your meals!",
                                  kind="success", data={"sub_id": sub["id"]})
        return {"status": "active", "subscription": sub}

    if body.payment_mode == "cod":
        # COD for subscription: activate, mark pending COD collection on first delivery
        sub = await _activate_subscription(user["id"], plan, payment_status="cod_pending")
        await create_notification(user["id"], "Subscription activated 🎉",
                                  f"{plan['name']} starts today. We'll collect cash on first delivery.",
                                  kind="success", data={"sub_id": sub["id"]})
        return {"status": "active", "subscription": sub, "cod": True}

    # stripe
    host = body.origin_url or str(request.base_url).rstrip("/")
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_co = StripeCheckout(api_key=os.environ["STRIPE_API_KEY"], webhook_url=webhook_url)
    success_url = f"{host}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host}/plans"
    co_req = CheckoutSessionRequest(
        amount=float(plan["price"]), currency="inr",
        success_url=success_url, cancel_url=cancel_url,
        metadata={"user_id": user["id"], "plan_id": plan["id"], "kind": "subscription"},
    )
    session = await stripe_co.create_checkout_session(co_req)
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": user["id"],
        "amount": float(plan["price"]),
        "currency": "inr",
        "kind": "subscription",
        "plan_id": plan["id"],
        "payment_status": "initiated",
        "status": "pending",
        "metadata": {"plan_id": plan["id"]},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"checkout_url": session.url, "session_id": session.session_id}


async def _activate_subscription(user_id: str, plan: dict, payment_status: str = "paid") -> dict:
    sub_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    sub = {
        "id": sub_id,
        "user_id": user_id,
        "plan_id": plan["id"],
        "plan_name": plan["name"],
        "meals_left": plan["meal_count"],
        "total_meals": plan["meal_count"],
        "starts_at": now.date().isoformat(),
        "expires_at": (now.date() + timedelta(days=plan["validity_days"])).isoformat(),
        "paused_dates": [],
        "delivered_dates": [],
        "status": "active",
        "payment_status": payment_status,
        "created_at": now.isoformat(),
    }
    await db.user_subscriptions.insert_one(sub)
    sub.pop("_id", None)
    return sub


@api.get("/subscriptions/mine")
async def my_subscriptions(user: dict = Depends(get_current_user)):
    items = await db.user_subscriptions.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return items


@api.get("/subscriptions/active")
async def active_subscription(user: dict = Depends(get_current_user)):
    item = await db.user_subscriptions.find_one(
        {"user_id": user["id"], "status": "active"}, {"_id": 0},
        sort=[("created_at", -1)],
    )
    return item


@api.post("/subscriptions/pause")
async def pause_sub(body: PauseBody, user: dict = Depends(get_current_user)):
    sub = await db.user_subscriptions.find_one({"id": body.subscription_id, "user_id": user["id"]})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if body.date in sub.get("paused_dates", []):
        return {"ok": True, "already_paused": True}
    # 10:00 AM IST cutoff check (IST = UTC+5:30)
    now_utc = datetime.now(timezone.utc)
    ist = now_utc + timedelta(hours=5, minutes=30)
    target_date = datetime.strptime(body.date, "%Y-%m-%d").date()
    extends = True
    if target_date == ist.date() and ist.hour >= 10:
        extends = False
    update = {"$push": {"paused_dates": body.date}}
    if extends:
        # extend expires_at by 1 day
        new_expiry = (datetime.strptime(sub["expires_at"], "%Y-%m-%d").date() + timedelta(days=1)).isoformat()
        update["$set"] = {"expires_at": new_expiry}
    await db.user_subscriptions.update_one({"id": body.subscription_id}, update)
    return {"ok": True, "extended": extends}


@api.post("/subscriptions/resume")
async def resume_sub(body: PauseBody, user: dict = Depends(get_current_user)):
    sub = await db.user_subscriptions.find_one({"id": body.subscription_id, "user_id": user["id"]})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if body.date not in sub.get("paused_dates", []):
        return {"ok": True, "not_paused": True}
    new_expiry = (datetime.strptime(sub["expires_at"], "%Y-%m-%d").date() - timedelta(days=1)).isoformat()
    await db.user_subscriptions.update_one(
        {"id": body.subscription_id},
        {"$pull": {"paused_dates": body.date}, "$set": {"expires_at": new_expiry}},
    )
    return {"ok": True}


# ============================================================
# ORDERS (one-time)
# ============================================================
@api.post("/orders/create")
async def create_order(body: OrderBody, request: Request, user: dict = Depends(get_current_user)):
    if body.payment_mode == "cod":
        settings = await get_settings()
        if not settings.get("cod_enabled", True):
            raise HTTPException(status_code=400, detail="Cash on delivery is currently disabled")
    # default one-time order price
    meal_price = 149.0
    order_id = str(uuid.uuid4())
    base_order = {
        "id": order_id,
        "user_id": user["id"],
        "order_type": "one_time",
        "menu_date": body.menu_date,
        "amount": meal_price,
        "address": body.address or user.get("address_summary"),
        "notes": body.notes,
        "status": "preparing",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    if body.payment_mode == "wallet":
        if user.get("wallet_balance", 0) < meal_price:
            raise HTTPException(status_code=400, detail="Insufficient wallet balance")
        await db.users.update_one({"id": user["id"]}, {"$inc": {"wallet_balance": -meal_price}})
        await db.wallet_transactions.insert_one({
            "id": str(uuid.uuid4()), "user_id": user["id"], "type": "debit",
            "amount": meal_price, "source": "order", "note": "One-time tiffin order",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        base_order["payment_mode"] = "wallet"
        base_order["payment_status"] = "paid"
        await db.orders.insert_one(base_order)
        base_order.pop("_id", None)
        return base_order

    if body.payment_mode == "cod":
        base_order["payment_mode"] = "cod"
        base_order["payment_status"] = "cod_pending"
        base_order["cod_otp"] = f"{uuid.uuid4().int % 10000:04d}"
        await db.orders.insert_one(base_order)
        base_order.pop("_id", None)
        return base_order

    # stripe
    host = body.origin_url or str(request.base_url).rstrip("/")
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_co = StripeCheckout(api_key=os.environ["STRIPE_API_KEY"], webhook_url=webhook_url)
    success_url = f"{host}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host}/menu"
    co_req = CheckoutSessionRequest(
        amount=meal_price, currency="inr",
        success_url=success_url, cancel_url=cancel_url,
        metadata={"user_id": user["id"], "order_id": order_id, "kind": "order"},
    )
    session = await stripe_co.create_checkout_session(co_req)
    base_order["payment_mode"] = "stripe"
    base_order["payment_status"] = "initiated"
    base_order["stripe_session_id"] = session.session_id
    await db.orders.insert_one(base_order)
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": user["id"],
        "amount": meal_price,
        "currency": "inr",
        "kind": "order",
        "order_id": order_id,
        "payment_status": "initiated",
        "status": "pending",
        "metadata": {"order_id": order_id},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"checkout_url": session.url, "session_id": session.session_id, "order_id": order_id}


@api.get("/orders/mine")
async def my_orders(user: dict = Depends(get_current_user)):
    items = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return items


@api.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    item = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Order not found")
    if item["user_id"] != user["id"] and user.get("role") not in ("admin", "delivery"):
        raise HTTPException(status_code=403, detail="Forbidden")
    return item


# ============================================================
# WALLET
# ============================================================
@api.get("/wallet/balance")
async def wallet_balance(user: dict = Depends(get_current_user)):
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "wallet_balance": 1})
    return {"balance": fresh.get("wallet_balance", 0)}


@api.get("/wallet/transactions")
async def wallet_transactions(user: dict = Depends(get_current_user)):
    items = await db.wallet_transactions.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return items


@api.post("/wallet/recharge")
async def wallet_recharge(body: WalletRechargeBody, request: Request, user: dict = Depends(get_current_user)):
    if body.amount < 50 or body.amount > 50000:
        raise HTTPException(status_code=400, detail="Amount must be between 50 and 50000")
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_co = StripeCheckout(api_key=os.environ["STRIPE_API_KEY"], webhook_url=webhook_url)
    success_url = f"{body.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{body.origin_url}/wallet"
    co_req = CheckoutSessionRequest(
        amount=float(body.amount), currency="inr",
        success_url=success_url, cancel_url=cancel_url,
        metadata={"user_id": user["id"], "kind": "wallet_recharge", "amount": str(body.amount)},
    )
    session = await stripe_co.create_checkout_session(co_req)
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": user["id"],
        "amount": float(body.amount),
        "currency": "inr",
        "kind": "wallet_recharge",
        "payment_status": "initiated",
        "status": "pending",
        "metadata": {"amount": str(body.amount)},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"checkout_url": session.url, "session_id": session.session_id}


# ============================================================
# PAYMENTS
# ============================================================
@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if txn["payment_status"] == "paid":
        return txn

    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_co = StripeCheckout(api_key=os.environ["STRIPE_API_KEY"], webhook_url=webhook_url)
    status = await stripe_co.get_checkout_status(session_id)

    new_payment_status = status.payment_status
    new_status = status.status

    # Update txn (only once)
    if new_payment_status == "paid" and txn["payment_status"] != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "status": new_status,
                      "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        # Fulfill based on kind
        kind = txn["kind"]
        if kind == "wallet_recharge":
            amt = float(txn["amount"])
            await db.users.update_one({"id": txn["user_id"]}, {"$inc": {"wallet_balance": amt}})
            await db.wallet_transactions.insert_one({
                "id": str(uuid.uuid4()), "user_id": txn["user_id"], "type": "credit",
                "amount": amt, "source": "stripe_recharge",
                "note": "Wallet recharge via Stripe",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            await create_notification(txn["user_id"], "Wallet recharged ✨",
                                      f"₹{int(amt)} added to your wallet.",
                                      kind="success")
        elif kind == "subscription":
            plan = await db.subscription_plans.find_one({"id": txn["metadata"]["plan_id"]}, {"_id": 0})
            if plan:
                await _activate_subscription(txn["user_id"], plan, payment_status="paid")
        elif kind == "order":
            await db.orders.update_one(
                {"id": txn["metadata"]["order_id"]},
                {"$set": {"payment_status": "paid"}},
            )
    else:
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": new_payment_status, "status": new_status}},
        )

    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    return txn


@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    body_bytes = await request.body()
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_co = StripeCheckout(api_key=os.environ["STRIPE_API_KEY"], webhook_url=webhook_url)
    try:
        resp = await stripe_co.handle_webhook(body_bytes, request.headers.get("Stripe-Signature"))
    except Exception as e:
        logger.exception("webhook parse failed")
        raise HTTPException(status_code=400, detail=str(e))
    # We rely on polling for fulfillment to keep the flow simple/idempotent.
    return {"received": True, "event": resp.event_type if hasattr(resp, "event_type") else None}


# ============================================================
# DELIVERY
# ============================================================
@api.get("/delivery/assigned")
async def delivery_assigned(user: dict = Depends(get_current_user)):
    if user.get("role") not in ("delivery", "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    today = date.today().isoformat()
    orders = await db.orders.find(
        {"$or": [{"menu_date": today}, {"status": {"$in": ["preparing", "out_for_delivery"]}}]},
        {"_id": 0},
    ).sort("created_at", -1).to_list(200)
    return orders


@api.post("/delivery/update")
async def delivery_update(body: DeliveryStatusBody, user: dict = Depends(get_current_user)):
    if user.get("role") not in ("delivery", "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    order = await db.orders.find_one({"id": body.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    update: dict = {"status": body.status}
    if body.status == "delivered":
        if order.get("payment_mode") == "cod":
            if not body.otp or body.otp != order.get("cod_otp"):
                raise HTTPException(status_code=400, detail="Invalid COD OTP")
            update["payment_status"] = "paid"
        update["delivered_at"] = datetime.now(timezone.utc).isoformat()
    await db.orders.update_one({"id": body.order_id}, {"$set": update})
    # notify customer
    titles = {
        "out_for_delivery": ("Your tiffin is on the way 🛵", "Should reach you in 20-30 minutes."),
        "delivered": ("Tiffin delivered ✅", "Enjoy your meal! Rate it from your home screen."),
        "preparing": ("Tiffin in the kitchen 👩‍🍳", "Your meal is being freshly prepared."),
    }
    if body.status in titles:
        t, b = titles[body.status]
        await create_notification(order["user_id"], t, b, kind="delivery",
                                  data={"order_id": order["id"]})
    return {"ok": True, "status": body.status}


# ============================================================
# ADMIN
# ============================================================
@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({"role": "customer"})
    total_orders = await db.orders.count_documents({})
    active_subs = await db.user_subscriptions.count_documents({"status": "active"})
    paid_txns = await db.payment_transactions.find({"payment_status": "paid"}, {"_id": 0}).to_list(1000)
    revenue = sum(t.get("amount", 0) for t in paid_txns)
    return {"total_users": total_users, "total_orders": total_orders,
            "active_subscriptions": active_subs, "revenue": revenue}


@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_admin)):
    items = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    return items


@api.get("/admin/orders")
async def admin_orders(user: dict = Depends(require_admin)):
    items = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api.post("/admin/menu")
async def admin_create_menu(body: MenuBody, user: dict = Depends(require_admin)):
    doc = body.dict()
    await db.daily_menu.update_one({"date": body.date}, {"$set": doc}, upsert=True)
    return doc


@api.post("/admin/plans")
async def admin_create_plan(body: PlanBody, user: dict = Depends(require_admin)):
    plan = body.dict()
    plan["id"] = str(uuid.uuid4())
    await db.subscription_plans.insert_one(plan)
    return plan


# ============================================================
# Settings / Notifications / Push helpers
# ============================================================
async def get_settings() -> dict:
    s = await db.settings.find_one({"_id": "main"})
    if not s:
        s = {
            "_id": "main",
            "cod_enabled": True,
            "delivery_zones": ["560034", "560037", "560038", "560095"],
            "vapid_public": None,
            "vapid_private_pem": None,
        }
        # auto-generate VAPID keys (P-256 EC)
        try:
            priv_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
            priv_pem = priv_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption(),
            ).decode("utf-8")
            pub_raw = priv_key.public_key().public_bytes(
                encoding=serialization.Encoding.X962,
                format=serialization.PublicFormat.UncompressedPoint,
            )
            s["vapid_public"] = base64.urlsafe_b64encode(pub_raw).rstrip(b"=").decode("utf-8")
            s["vapid_private_pem"] = priv_pem
        except Exception as e:
            logger.warning(f"VAPID gen failed: {e}")
        await db.settings.insert_one(s)
    return s


async def create_notification(user_id: str, title: str, body: str, kind: str = "info",
                              data: Optional[dict] = None) -> dict:
    n = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "body": body,
        "kind": kind,
        "data": data or {},
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(n)
    n.pop("_id", None)
    # try web push (non-blocking best-effort)
    try:
        await _send_push(user_id, {"title": title, "body": body, "data": n.get("data", {})})
    except Exception as e:
        logger.info(f"push send failed (non-fatal): {e}")
    return n


async def _send_push(user_id: str, payload: dict):
    settings = await get_settings()
    priv_pem = settings.get("vapid_private_pem")
    if not priv_pem:
        return
    subs = await db.push_subscriptions.find({"user_id": user_id}, {"_id": 0}).to_list(50)
    for sub in subs:
        try:
            webpush(
                subscription_info=sub["subscription"],
                data=_json.dumps(payload),
                vapid_private_key=priv_pem,
                vapid_claims={"sub": "mailto:admin@tiffinflow.com"},
            )
        except WebPushException as ex:
            if ex.response is not None and ex.response.status_code in (404, 410):
                await db.push_subscriptions.delete_one({"id": sub["id"]})


# ============================================================
# NOTIFICATIONS API
# ============================================================
@api.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    items = await db.notifications.find(
        {"user_id": user["id"]}, {"_id": 0},
    ).sort("created_at", -1).limit(50).to_list(50)
    unread = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"items": items, "unread": unread}


@api.post("/notifications/{notif_id}/read")
async def read_notif(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notif_id, "user_id": user["id"]}, {"$set": {"read": True}}
    )
    return {"ok": True}


@api.post("/notifications/read-all")
async def read_all_notifs(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user["id"], "read": False}, {"$set": {"read": True}}
    )
    return {"ok": True}


# ============================================================
# PUSH SUBSCRIPTION API
# ============================================================
class PushSubBody(BaseModel):
    subscription: dict


@api.get("/push/vapid-public")
async def vapid_public():
    s = await get_settings()
    return {"public_key": s.get("vapid_public")}


@api.post("/push/subscribe")
async def push_subscribe(body: PushSubBody, user: dict = Depends(get_current_user)):
    endpoint = body.subscription.get("endpoint")
    if not endpoint:
        raise HTTPException(status_code=400, detail="Invalid subscription")
    existing = await db.push_subscriptions.find_one({"user_id": user["id"], "endpoint": endpoint})
    if existing:
        return {"ok": True, "existing": True}
    await db.push_subscriptions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "endpoint": endpoint,
        "subscription": body.subscription,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await create_notification(user["id"], "Notifications enabled",
                              "We'll ping you about deliveries, pauses and wallet updates.",
                              kind="success")
    return {"ok": True}


# ============================================================
# ADMIN — Menu / Plans / Settings CRUD
# ============================================================
@api.get("/admin/menu")
async def admin_list_menu(user: dict = Depends(require_admin)):
    items = await db.daily_menu.find({}, {"_id": 0}).sort("date", 1).to_list(200)
    return items


@api.put("/admin/menu/{menu_date}")
async def admin_update_menu(menu_date: str, body: MenuBody, user: dict = Depends(require_admin)):
    doc = body.dict()
    doc["date"] = menu_date
    await db.daily_menu.update_one({"date": menu_date}, {"$set": doc}, upsert=True)
    return doc


@api.delete("/admin/menu/{menu_date}")
async def admin_delete_menu(menu_date: str, user: dict = Depends(require_admin)):
    await db.daily_menu.delete_one({"date": menu_date})
    return {"ok": True}


@api.get("/admin/plans")
async def admin_list_plans(user: dict = Depends(require_admin)):
    items = await db.subscription_plans.find({}, {"_id": 0}).to_list(100)
    return items


@api.put("/admin/plans/{plan_id}")
async def admin_update_plan(plan_id: str, body: PlanBody, user: dict = Depends(require_admin)):
    doc = body.dict()
    doc["id"] = plan_id
    await db.subscription_plans.update_one({"id": plan_id}, {"$set": doc}, upsert=True)
    return doc


@api.delete("/admin/plans/{plan_id}")
async def admin_delete_plan(plan_id: str, user: dict = Depends(require_admin)):
    await db.subscription_plans.delete_one({"id": plan_id})
    return {"ok": True}


class SettingsBody(BaseModel):
    cod_enabled: Optional[bool] = None
    delivery_zones: Optional[List[str]] = None


@api.get("/settings/public")
async def public_settings():
    s = await get_settings()
    return {
        "cod_enabled": s.get("cod_enabled", True),
        "delivery_zones": s.get("delivery_zones", []),
    }


@api.get("/admin/settings")
async def admin_settings(user: dict = Depends(require_admin)):
    s = await get_settings()
    return {
        "cod_enabled": s.get("cod_enabled", True),
        "delivery_zones": s.get("delivery_zones", []),
    }


@api.put("/admin/settings")
async def admin_update_settings(body: SettingsBody, user: dict = Depends(require_admin)):
    upd = {k: v for k, v in body.dict().items() if v is not None}
    if upd:
        await db.settings.update_one({"_id": "main"}, {"$set": upd}, upsert=True)
    s = await get_settings()
    return {
        "cod_enabled": s.get("cod_enabled", True),
        "delivery_zones": s.get("delivery_zones", []),
    }


# ============================================================
# ORDER TRACKING (polling endpoint)
# ============================================================
@api.get("/orders/{order_id}/track")
async def track_order(order_id: str, user: dict = Depends(get_current_user)):
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    if o["user_id"] != user["id"] and user.get("role") not in ("admin", "delivery"):
        raise HTTPException(status_code=403, detail="Forbidden")
    # Compose timeline
    steps = []
    created = o.get("created_at")
    steps.append({"label": "Order placed", "state": "done", "at": created})
    if o["status"] in ("preparing", "out_for_delivery", "delivered"):
        steps.append({"label": "Preparing in kitchen", "state": "done" if o["status"] != "preparing" else "active", "at": created})
    else:
        steps.append({"label": "Preparing in kitchen", "state": "pending", "at": None})
    if o["status"] in ("out_for_delivery", "delivered"):
        steps.append({"label": "Out for delivery", "state": "done" if o["status"] == "delivered" else "active", "at": None})
    else:
        steps.append({"label": "Out for delivery", "state": "pending", "at": None})
    steps.append({"label": "Delivered", "state": "done" if o["status"] == "delivered" else "pending",
                  "at": o.get("delivered_at")})
    return {"order": o, "timeline": steps, "now": datetime.now(timezone.utc).isoformat()}



app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def seed_data():
    # Admin
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(os.environ["ADMIN_PASSWORD"]),
            "full_name": "TiffinFlow Admin",
            "phone": None,
            "role": "admin",
            "wallet_balance": 0.0,
            "onboarded": True,
            "dietary_tags": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    # Delivery partner
    if not await db.users.find_one({"email": "delivery@tiffinflow.com"}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": "delivery@tiffinflow.com",
            "password_hash": hash_password("delivery123"),
            "full_name": "Ramesh Kumar",
            "phone": "+919876543210",
            "role": "delivery",
            "wallet_balance": 0.0,
            "onboarded": True,
            "dietary_tags": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Plans
    if await db.subscription_plans.count_documents({}) == 0:
        await db.subscription_plans.insert_many([
            {"id": str(uuid.uuid4()), "name": "Trial Day", "description": "Try one tiffin before subscribing.",
             "meal_count": 1, "price": 99.0, "validity_days": 1, "badge": "Try once"},
            {"id": str(uuid.uuid4()), "name": "Weekly Plan", "description": "7 home-style tiffins delivered Mon-Sun.",
             "meal_count": 7, "price": 899.0, "validity_days": 7, "badge": "Most flexible"},
            {"id": str(uuid.uuid4()), "name": "Monthly Plan", "description": "30 chef-curated tiffins. Pause anytime.",
             "meal_count": 30, "price": 3499.0, "validity_days": 31, "badge": "Most popular"},
            {"id": str(uuid.uuid4()), "name": "High Protein", "description": "30 high-protein tiffins for fitness goals.",
             "meal_count": 30, "price": 3999.0, "validity_days": 31, "badge": "Fitness pick"},
        ])

    # Seed weekly menu (Mon-Sun for current week)
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    sample_menus = [
        {"main_dish": "Paneer Butter Masala", "sides": ["Jeera Rice", "Tawa Roti", "Salad", "Gulab Jamun"],
         "nutrition": {"calories": 720, "protein": 28, "carbs": 80, "fat": 24}, "is_special": False,
         "image_url": "https://images.unsplash.com/photo-1542444256-9dd3e45c9b81?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
         "tags": ["veg", "north_indian"]},
        {"main_dish": "Rajma Chawal Bowl", "sides": ["Basmati Rice", "Cucumber Raita", "Pickle"],
         "nutrition": {"calories": 650, "protein": 22, "carbs": 90, "fat": 16}, "is_special": False,
         "image_url": "https://images.unsplash.com/photo-1734330932655-e6f3e7aff297?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
         "tags": ["veg", "comfort"]},
        {"main_dish": "Chole Bhature Combo", "sides": ["Bhature x2", "Onion Salad", "Sweet Lassi"],
         "nutrition": {"calories": 850, "protein": 24, "carbs": 110, "fat": 32}, "is_special": True,
         "image_url": "https://images.unsplash.com/photo-1542444256-9dd3e45c9b81?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
         "tags": ["veg", "special", "punjabi"]},
        {"main_dish": "Mixed Veg Thali", "sides": ["Roti", "Dal Tadka", "Sabzi", "Rice", "Buttermilk"],
         "nutrition": {"calories": 690, "protein": 24, "carbs": 88, "fat": 20}, "is_special": False,
         "image_url": "https://images.unsplash.com/photo-1774106425926-bdbab1356790?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
         "tags": ["veg", "thali"]},
        {"main_dish": "Bhindi Masala + Aloo Paratha", "sides": ["Curd", "Salad", "Mint Chutney"],
         "nutrition": {"calories": 680, "protein": 18, "carbs": 92, "fat": 22}, "is_special": False,
         "image_url": "https://images.unsplash.com/photo-1542444256-9dd3e45c9b81?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
         "tags": ["veg"]},
        {"main_dish": "Dal Makhani + Naan", "sides": ["Garlic Naan", "Jeera Rice", "Salad", "Rasmalai"],
         "nutrition": {"calories": 820, "protein": 26, "carbs": 96, "fat": 30}, "is_special": True,
         "image_url": "https://images.unsplash.com/photo-1734330932655-e6f3e7aff297?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
         "tags": ["veg", "special"]},
        {"main_dish": "Sunday Veg Biryani", "sides": ["Mirchi ka Salan", "Raita", "Salad"],
         "nutrition": {"calories": 780, "protein": 22, "carbs": 102, "fat": 26}, "is_special": True,
         "image_url": "https://images.unsplash.com/photo-1774106425926-bdbab1356790?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
         "tags": ["veg", "special", "biryani"]},
    ]
    for i, base in enumerate(sample_menus):
        d = (monday + timedelta(days=i)).isoformat()
        existing = await db.daily_menu.find_one({"date": d})
        if not existing:
            await db.daily_menu.insert_one({"date": d, **base})


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.user_subscriptions.create_index("user_id")
    await db.orders.create_index("user_id")
    await db.daily_menu.create_index("date", unique=True)
    await db.payment_transactions.create_index("session_id", unique=True)
    await seed_data()
    logger.info("TiffinFlow seeded.")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
