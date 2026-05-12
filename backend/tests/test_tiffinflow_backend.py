"""TiffinFlow backend API tests covering auth, menu, plans, subs, orders, wallet, delivery, admin."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://flow-meals.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@tiffinflow.com"
ADMIN_PASS = "admin123"
DELIVERY_EMAIL = "delivery@tiffinflow.com"
DELIVERY_PASS = "delivery123"


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def s():
    # NOTE: do NOT share cookies between users. We use this only for unauthenticated calls.
    # For per-user requests, callers pass explicit Authorization headers and use plain requests.
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def _login(email, pwd):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pwd})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token():
    return _login(ADMIN_EMAIL, ADMIN_PASS)


@pytest.fixture(scope="session")
def delivery_token():
    return _login(DELIVERY_EMAIL, DELIVERY_PASS)


@pytest.fixture(scope="session")
def customer():
    """Register a fresh customer and return dict(token, user, email, password)."""
    email = f"test_user_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "Passw0rd!123"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": pwd, "full_name": "Test User", "phone": "+919999999999",
    })
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    body = r.json()
    return {"token": body["access_token"], "user": body["user"], "email": email, "password": pwd}


def _h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------------- AUTH ----------------
class TestAuth:
    def test_register_creates_user_with_welcome_credit(self, customer):
        u = customer["user"]
        assert u["email"] == customer["email"]
        assert u["role"] == "customer"
        assert u["wallet_balance"] == 100.0
        assert "password_hash" not in u
        assert customer["token"]

    def test_register_duplicate_email_400(self, s, customer):
        r = requests.post(f"{API}/auth/register", json={
            "email": customer["email"], "password": "Whatever1!", "full_name": "x",
        })
        assert r.status_code == 400

    def test_login_admin_returns_admin_role(self, s):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["role"] == "admin"
        assert data["access_token"]

    def test_login_delivery_returns_delivery_role(self, s):
        r = requests.post(f"{API}/auth/login", json={"email": DELIVERY_EMAIL, "password": DELIVERY_PASS})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "delivery"

    def test_login_invalid_password_401(self, s):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_requires_auth(self, s):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_returns_user_with_bearer(self, s, customer):
        r = requests.get(f"{API}/auth/me", headers=_h(customer["token"]))
        assert r.status_code == 200
        assert r.json()["email"] == customer["email"]

    def test_patch_profile_updates_and_sets_onboarded(self, s, customer):
        r = requests.patch(f"{API}/auth/profile", headers=_h(customer["token"]), json={
            "dietary_tags": ["veg", "no_onion"], "address_summary": "Flat 1, Bangalore",
        })
        assert r.status_code == 200
        body = r.json()
        assert body["dietary_tags"] == ["veg", "no_onion"]
        assert body["address_summary"] == "Flat 1, Bangalore"
        assert body["onboarded"] is True


# ---------------- MENU ----------------
class TestMenu:
    def test_week_menu_returns_7_days_from_monday(self, s, customer):
        r = requests.get(f"{API}/menu/week", headers=_h(customer["token"]))
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) == 7
        from datetime import datetime
        first = datetime.strptime(items[0]["date"], "%Y-%m-%d").date()
        assert first.weekday() == 0  # Monday

    def test_menu_today(self, s, customer):
        r = requests.get(f"{API}/menu/today", headers=_h(customer["token"]))
        assert r.status_code == 200
        item = r.json()
        assert "date" in item and "main_dish" in item

    def test_menu_requires_auth(self):
        r = requests.get(f"{API}/menu/today")
        assert r.status_code == 401


# ---------------- PLANS ----------------
class TestPlans:
    def test_plans_seeded(self, s):
        r = requests.get(f"{API}/plans")
        assert r.status_code == 200
        plans = r.json()
        names = {p["name"] for p in plans}
        assert {"Trial Day", "Weekly Plan", "Monthly Plan", "High Protein"}.issubset(names)
        assert len(plans) >= 4


# ---------------- SUBSCRIPTIONS ----------------
class TestSubscriptions:
    def test_subscribe_wallet_trial_day(self, s, customer):
        plans = requests.get(f"{API}/plans").json()
        trial = next(p for p in plans if p["name"] == "Trial Day")
        r = requests.post(f"{API}/subscriptions/subscribe", headers=_h(customer["token"]),
                   json={"plan_id": trial["id"], "payment_mode": "wallet"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "active"
        assert body["subscription"]["plan_id"] == trial["id"]
        assert body["subscription"]["meals_left"] == trial["meal_count"]
        # Wallet should be 100 - 99 = 1.0
        bal = requests.get(f"{API}/wallet/balance", headers=_h(customer["token"])).json()
        assert abs(bal["balance"] - 1.0) < 0.01

    def test_subscribe_wallet_insufficient_400(self, s, customer):
        plans = requests.get(f"{API}/plans").json()
        weekly = next(p for p in plans if p["name"] == "Weekly Plan")
        r = requests.post(f"{API}/subscriptions/subscribe", headers=_h(customer["token"]),
                   json={"plan_id": weekly["id"], "payment_mode": "wallet"})
        assert r.status_code == 400

    def test_subscribe_cod_activates(self, s, customer):
        plans = requests.get(f"{API}/plans").json()
        weekly = next(p for p in plans if p["name"] == "Weekly Plan")
        r = requests.post(f"{API}/subscriptions/subscribe", headers=_h(customer["token"]),
                   json={"plan_id": weekly["id"], "payment_mode": "cod"})
        assert r.status_code == 200
        b = r.json()
        assert b["status"] == "active"
        assert b["subscription"]["payment_status"] == "cod_pending"
        assert b.get("cod") is True

    def test_subscribe_stripe_returns_checkout_url(self, s, customer):
        plans = requests.get(f"{API}/plans").json()
        monthly = next(p for p in plans if p["name"] == "Monthly Plan")
        r = requests.post(f"{API}/subscriptions/subscribe", headers=_h(customer["token"]),
                   json={"plan_id": monthly["id"], "payment_mode": "stripe",
                         "origin_url": "https://flow-meals.preview.emergentagent.com"})
        assert r.status_code == 200, r.text
        b = r.json()
        assert b.get("checkout_url", "").startswith("http")
        assert b.get("session_id")

    def test_subscribe_invalid_plan_404(self, s, customer):
        r = requests.post(f"{API}/subscriptions/subscribe", headers=_h(customer["token"]),
                   json={"plan_id": "nope", "payment_mode": "cod"})
        assert r.status_code == 404

    def test_my_and_active_subs(self, s, customer):
        r1 = requests.get(f"{API}/subscriptions/mine", headers=_h(customer["token"]))
        assert r1.status_code == 200
        assert len(r1.json()) >= 1
        r2 = requests.get(f"{API}/subscriptions/active", headers=_h(customer["token"]))
        assert r2.status_code == 200
        assert r2.json() is not None

    def test_pause_then_resume(self, s, customer):
        sub = requests.get(f"{API}/subscriptions/active", headers=_h(customer["token"])).json()
        from datetime import date, timedelta
        target = (date.today() + timedelta(days=2)).isoformat()
        rp = requests.post(f"{API}/subscriptions/pause", headers=_h(customer["token"]),
                    json={"subscription_id": sub["id"], "date": target})
        assert rp.status_code == 200
        subs = requests.get(f"{API}/subscriptions/mine", headers=_h(customer["token"])).json()
        cur = next(x for x in subs if x["id"] == sub["id"])
        assert target in cur["paused_dates"]
        rr = requests.post(f"{API}/subscriptions/resume", headers=_h(customer["token"]),
                    json={"subscription_id": sub["id"], "date": target})
        assert rr.status_code == 200
        subs2 = requests.get(f"{API}/subscriptions/mine", headers=_h(customer["token"])).json()
        cur2 = next(x for x in subs2 if x["id"] == sub["id"])
        assert target not in cur2["paused_dates"]


# ---------------- ORDERS ----------------
class TestOrders:
    def test_order_wallet_insufficient(self, s, customer):
        from datetime import date
        # After Trial subscription, balance ~ 1.0; meal price is 149
        r = requests.post(f"{API}/orders/create", headers=_h(customer["token"]),
                   json={"menu_date": date.today().isoformat(), "payment_mode": "wallet"})
        assert r.status_code == 400

    def test_order_cod_creates_with_otp(self, s, customer):
        from datetime import date
        r = requests.post(f"{API}/orders/create", headers=_h(customer["token"]),
                   json={"menu_date": date.today().isoformat(), "payment_mode": "cod",
                         "address": "Flat 1, Bangalore"})
        assert r.status_code == 200, r.text
        o = r.json()
        assert o["payment_mode"] == "cod"
        assert o["payment_status"] == "cod_pending"
        assert o.get("cod_otp") and len(o["cod_otp"]) == 4
        pytest.cod_order = o  # stash for delivery tests

    def test_order_stripe_returns_checkout(self, s, customer):
        from datetime import date
        r = requests.post(f"{API}/orders/create", headers=_h(customer["token"]),
                   json={"menu_date": date.today().isoformat(), "payment_mode": "stripe",
                         "origin_url": "https://flow-meals.preview.emergentagent.com"})
        assert r.status_code == 200, r.text
        b = r.json()
        assert b.get("checkout_url", "").startswith("http")
        assert b.get("session_id")
        assert b.get("order_id")

    def test_orders_mine(self, s, customer):
        r = requests.get(f"{API}/orders/mine", headers=_h(customer["token"]))
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 2


# ---------------- WALLET ----------------
class TestWallet:
    def test_balance(self, s, customer):
        r = requests.get(f"{API}/wallet/balance", headers=_h(customer["token"]))
        assert r.status_code == 200
        assert "balance" in r.json()

    def test_transactions_include_welcome(self, s, customer):
        r = requests.get(f"{API}/wallet/transactions", headers=_h(customer["token"]))
        assert r.status_code == 200
        txns = r.json()
        assert any(t.get("source") == "welcome_bonus" for t in txns)

    def test_recharge_below_min_400(self, s, customer):
        r = requests.post(f"{API}/wallet/recharge", headers=_h(customer["token"]),
                   json={"amount": 10, "origin_url": "https://flow-meals.preview.emergentagent.com"})
        assert r.status_code == 400

    def test_recharge_above_max_400(self, s, customer):
        r = requests.post(f"{API}/wallet/recharge", headers=_h(customer["token"]),
                   json={"amount": 60000, "origin_url": "https://flow-meals.preview.emergentagent.com"})
        assert r.status_code == 400

    def test_recharge_valid_returns_checkout(self, s, customer):
        r = requests.post(f"{API}/wallet/recharge", headers=_h(customer["token"]),
                   json={"amount": 500, "origin_url": "https://flow-meals.preview.emergentagent.com"})
        assert r.status_code == 200, r.text
        b = r.json()
        assert b.get("checkout_url", "").startswith("http")
        assert b.get("session_id")


# ---------------- DELIVERY ----------------
class TestDelivery:
    def test_delivery_update_forbidden_for_customer(self, s, customer):
        r = requests.post(f"{API}/delivery/update", headers=_h(customer["token"]),
                   json={"order_id": "any", "status": "preparing"})
        assert r.status_code == 403

    def test_delivery_assigned_for_delivery_role(self, s, delivery_token):
        r = requests.get(f"{API}/delivery/assigned", headers=_h(delivery_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_delivery_status_transitions_and_cod_otp(self, s, delivery_token):
        cod_order = getattr(pytest, "cod_order", None)
        if not cod_order:
            pytest.skip("No COD order created earlier")
        oid = cod_order["id"]
        # preparing -> out_for_delivery
        r = requests.post(f"{API}/delivery/update", headers=_h(delivery_token),
                   json={"order_id": oid, "status": "out_for_delivery"})
        assert r.status_code == 200
        # delivered without OTP -> 400
        r2 = requests.post(f"{API}/delivery/update", headers=_h(delivery_token),
                    json={"order_id": oid, "status": "delivered"})
        assert r2.status_code == 400
        # delivered with wrong OTP -> 400
        r3 = requests.post(f"{API}/delivery/update", headers=_h(delivery_token),
                    json={"order_id": oid, "status": "delivered", "otp": "0000"})
        assert r3.status_code == 400 or (cod_order["cod_otp"] == "0000" and r3.status_code == 200)
        # delivered with correct OTP -> 200; payment_status becomes paid
        r4 = requests.post(f"{API}/delivery/update", headers=_h(delivery_token),
                    json={"order_id": oid, "status": "delivered", "otp": cod_order["cod_otp"]})
        assert r4.status_code == 200, r4.text


# ---------------- ADMIN ----------------
class TestAdmin:
    def test_admin_stats_requires_admin(self, s, customer):
        r = requests.get(f"{API}/admin/stats", headers=_h(customer["token"]))
        assert r.status_code == 403

    def test_admin_stats(self, s, admin_token):
        r = requests.get(f"{API}/admin/stats", headers=_h(admin_token))
        assert r.status_code == 200
        b = r.json()
        for k in ("total_users", "total_orders", "active_subscriptions", "revenue"):
            assert k in b

    def test_admin_users(self, s, admin_token):
        r = requests.get(f"{API}/admin/users", headers=_h(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert all("password_hash" not in u for u in r.json())

    def test_admin_orders(self, s, admin_token):
        r = requests.get(f"{API}/admin/orders", headers=_h(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------------- WEBHOOK ----------------
class TestWebhook:
    def test_webhook_endpoint_exists(self, s):
        # without valid signature it should NOT be 404; expect 400 (parse fail) or 200
        r = requests.post(f"{API}/webhook/stripe", data=b"{}", headers={"Content-Type": "application/json"})
        assert r.status_code != 404
