"""TiffinFlow P1 backend tests: brute-force lockout, notifications, push, admin CRUD, COD toggle, order tracking, RBAC."""
import os
import uuid
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://flow-meals.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@tiffinflow.com"
ADMIN_PASS = "admin123"
DELIVERY_EMAIL = "delivery@tiffinflow.com"
DELIVERY_PASS = "delivery123"


# ---------------- Helpers ----------------
def _h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _login(email, pwd):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pwd})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


def _register_customer():
    email = f"test_p1_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "Passw0rd!123"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": pwd, "full_name": "P1 Test", "phone": "+919999999999",
    })
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    body = r.json()
    return {"token": body["access_token"], "user": body["user"], "email": email, "password": pwd}


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def admin_token():
    return _login(ADMIN_EMAIL, ADMIN_PASS)


@pytest.fixture(scope="session")
def delivery_token():
    return _login(DELIVERY_EMAIL, DELIVERY_PASS)


@pytest.fixture(scope="session")
def customer():
    return _register_customer()


@pytest.fixture(scope="session", autouse=True)
def _ensure_cod_enabled_after_run(admin_token):
    """Ensure COD remains enabled at the end of the test session regardless of failures."""
    yield
    try:
        requests.put(f"{API}/admin/settings", headers=_h(admin_token), json={"cod_enabled": True})
    except Exception:
        pass


# ---------------- BRUTE-FORCE LOCKOUT ----------------
class TestBruteForceLockout:
    def test_lockout_after_five_failures_then_clears_on_success(self):
        # Register a fresh user
        u = _register_customer()
        email = u["email"]
        good_pwd = u["password"]
        # 5 wrong attempts -> still 401 (the 5th may already mark as locked, but
        # the lockout response is returned on the 6th attempt because _check_lockout
        # runs BEFORE the password check)
        for i in range(5):
            r = requests.post(f"{API}/auth/login", json={"email": email, "password": "wrongPass!"})
            assert r.status_code == 401, f"attempt {i+1} expected 401, got {r.status_code}: {r.text}"

        # 6th attempt — even with correct password, must be 429 (locked)
        r6 = requests.post(f"{API}/auth/login", json={"email": email, "password": good_pwd})
        assert r6.status_code == 429, f"expected 429 lockout, got {r6.status_code}: {r6.text}"
        body = r6.json()
        # detail field contains the lockout message
        assert "too many" in str(body).lower() or "attempt" in str(body).lower()

    def test_successful_login_clears_attempts(self):
        # Fresh user, 4 wrong (below threshold), then 1 right — attempts should be cleared.
        u = _register_customer()
        email = u["email"]
        good_pwd = u["password"]
        for _ in range(4):
            r = requests.post(f"{API}/auth/login", json={"email": email, "password": "badpass!"})
            assert r.status_code == 401
        # Successful login
        ok = requests.post(f"{API}/auth/login", json={"email": email, "password": good_pwd})
        assert ok.status_code == 200, ok.text
        # Now 5 more wrong should NOT trigger lockout immediately (counter reset to 0)
        for i in range(4):
            r = requests.post(f"{API}/auth/login", json={"email": email, "password": "badpass!"})
            assert r.status_code == 401, f"after clear, attempt {i+1} should be 401"
        # one more good login should still succeed
        ok2 = requests.post(f"{API}/auth/login", json={"email": email, "password": good_pwd})
        assert ok2.status_code == 200, ok2.text


# ---------------- VAPID / PUSH ----------------
class TestPushVapid:
    def test_vapid_public_key_returned(self):
        r = requests.get(f"{API}/push/vapid-public")
        assert r.status_code == 200, r.text
        body = r.json()
        assert "public_key" in body
        pk = body["public_key"]
        assert isinstance(pk, str) and len(pk) > 50
        # url-safe base64 charset only
        allowed = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=")
        assert all(c in allowed for c in pk), f"non-urlsafe chars in vapid public: {pk!r}"
        # P-256 uncompressed point is 65 bytes -> base64 url-safe (no padding) is 87 chars
        # allow some flexibility (88 with padding)
        assert 80 <= len(pk) <= 92

    def test_public_settings_returns_shape(self):
        r = requests.get(f"{API}/settings/public")
        assert r.status_code == 200, r.text
        body = r.json()
        assert "cod_enabled" in body
        assert "delivery_zones" in body
        assert isinstance(body["delivery_zones"], list)

    def test_push_subscribe_requires_auth(self):
        r = requests.post(f"{API}/push/subscribe", json={"subscription": {"endpoint": "https://x"}})
        assert r.status_code == 401

    def test_push_subscribe_stores_and_creates_notification(self, customer):
        endpoint = f"https://fcm.example.test/{uuid.uuid4().hex}"
        sub = {
            "endpoint": endpoint,
            "keys": {"p256dh": "x" * 87, "auth": "y" * 22},
        }
        # initial notifications count
        n0 = requests.get(f"{API}/notifications", headers=_h(customer["token"])).json()
        before = len(n0["items"])

        r = requests.post(f"{API}/push/subscribe", headers=_h(customer["token"]),
                          json={"subscription": sub})
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

        # second call with same endpoint → dedup
        r2 = requests.post(f"{API}/push/subscribe", headers=_h(customer["token"]),
                           json={"subscription": sub})
        assert r2.status_code == 200
        assert r2.json().get("existing") is True

        # a notification "Notifications enabled" should have been created (only on first call)
        n1 = requests.get(f"{API}/notifications", headers=_h(customer["token"])).json()
        assert len(n1["items"]) == before + 1
        titles = [i["title"] for i in n1["items"]]
        assert "Notifications enabled" in titles

    def test_push_subscribe_invalid_400(self, customer):
        r = requests.post(f"{API}/push/subscribe", headers=_h(customer["token"]),
                          json={"subscription": {}})
        assert r.status_code == 400


# ---------------- NOTIFICATIONS ----------------
class TestNotifications:
    def test_notifications_requires_auth(self):
        r = requests.get(f"{API}/notifications")
        assert r.status_code == 401

    def test_list_mark_read_and_read_all(self):
        # Fresh customer to keep counts deterministic
        u = _register_customer()
        token = u["token"]
        # Trigger 2 notifications via push subscribe (1) + plan-subscribe wallet (would need balance ok)
        sub = {"endpoint": f"https://fcm.example.test/{uuid.uuid4().hex}", "keys": {}}
        r = requests.post(f"{API}/push/subscribe", headers=_h(token), json={"subscription": sub})
        assert r.status_code == 200

        # Subscribe to Trial Day (wallet 100, plan 99) -> creates "Subscription activated"
        plans = requests.get(f"{API}/plans").json()
        trial = next(p for p in plans if p["name"] == "Trial Day")
        sr = requests.post(f"{API}/subscriptions/subscribe", headers=_h(token),
                           json={"plan_id": trial["id"], "payment_mode": "wallet"})
        assert sr.status_code == 200, sr.text

        # List
        lr = requests.get(f"{API}/notifications", headers=_h(token))
        assert lr.status_code == 200
        body = lr.json()
        assert "items" in body and "unread" in body
        assert body["unread"] >= 2
        assert len(body["items"]) >= 2
        # Subscription activation notification exists
        titles = [i["title"] for i in body["items"]]
        assert any("Subscription activated" in t for t in titles)

        # Mark one as read
        nid = body["items"][0]["id"]
        mr = requests.post(f"{API}/notifications/{nid}/read", headers=_h(token))
        assert mr.status_code == 200
        # Unread should decrement
        lr2 = requests.get(f"{API}/notifications", headers=_h(token)).json()
        assert lr2["unread"] == body["unread"] - 1

        # Mark all read
        ar = requests.post(f"{API}/notifications/read-all", headers=_h(token))
        assert ar.status_code == 200
        lr3 = requests.get(f"{API}/notifications", headers=_h(token)).json()
        assert lr3["unread"] == 0


# ---------------- COD TOGGLE ----------------
class TestCodToggle:
    def test_cod_disabled_blocks_orders_and_subscriptions(self, admin_token):
        # Disable COD
        rs = requests.put(f"{API}/admin/settings", headers=_h(admin_token),
                          json={"cod_enabled": False})
        assert rs.status_code == 200
        assert rs.json()["cod_enabled"] is False

        # Public settings reflects it
        pub = requests.get(f"{API}/settings/public").json()
        assert pub["cod_enabled"] is False

        # Customer attempts COD order → 400
        u = _register_customer()
        from datetime import date as _d
        r_o = requests.post(f"{API}/orders/create", headers=_h(u["token"]), json={
            "menu_date": _d.today().isoformat(), "payment_mode": "cod", "address": "X",
        })
        assert r_o.status_code == 400, f"COD order should be blocked, got {r_o.status_code}: {r_o.text}"

        # Customer attempts COD subscription → 400 (per requirement)
        plans = requests.get(f"{API}/plans").json()
        weekly = next(p for p in plans if p["name"] == "Weekly Plan")
        r_s = requests.post(f"{API}/subscriptions/subscribe", headers=_h(u["token"]),
                            json={"plan_id": weekly["id"], "payment_mode": "cod"})
        # Note: implementation may or may not block subscription COD.
        # We record the status for the test report.
        assert r_s.status_code == 400, (
            f"Expected 400 when COD disabled for subscription, got {r_s.status_code}: {r_s.text}"
        )

        # Re-enable
        rs2 = requests.put(f"{API}/admin/settings", headers=_h(admin_token),
                           json={"cod_enabled": True})
        assert rs2.status_code == 200 and rs2.json()["cod_enabled"] is True

        # Now COD order succeeds
        r_o2 = requests.post(f"{API}/orders/create", headers=_h(u["token"]), json={
            "menu_date": _d.today().isoformat(), "payment_mode": "cod", "address": "X",
        })
        assert r_o2.status_code == 200, r_o2.text


# ---------------- ADMIN MENU / PLANS / SETTINGS CRUD ----------------
class TestAdminCRUD:
    def test_admin_menu_list_and_upsert_delete(self, admin_token):
        # List
        r = requests.get(f"{API}/admin/menu", headers=_h(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

        # Upsert a future date
        d = "2099-01-15"
        body = {
            "date": d, "main_dish": "Test Paneer", "sides": ["Rice", "Salad"],
            "nutrition": {"calories": 700}, "is_special": True, "image_url": None, "tags": ["veg"],
        }
        up = requests.put(f"{API}/admin/menu/{d}", headers=_h(admin_token), json=body)
        assert up.status_code == 200, up.text
        doc = up.json()
        assert doc["main_dish"] == "Test Paneer"
        assert doc["date"] == d

        # Verify present in list
        r2 = requests.get(f"{API}/admin/menu", headers=_h(admin_token)).json()
        assert any(m["date"] == d for m in r2)

        # Delete
        de = requests.delete(f"{API}/admin/menu/{d}", headers=_h(admin_token))
        assert de.status_code == 200
        r3 = requests.get(f"{API}/admin/menu", headers=_h(admin_token)).json()
        assert not any(m["date"] == d for m in r3)

    def test_admin_plans_list_upsert_delete(self, admin_token):
        # List
        plans = requests.get(f"{API}/admin/plans", headers=_h(admin_token))
        assert plans.status_code == 200
        assert isinstance(plans.json(), list) and len(plans.json()) >= 4

        # Upsert new plan
        pid = f"TEST_plan_{uuid.uuid4().hex[:6]}"
        body = {
            "name": "Test Plan", "description": "Auto", "meal_count": 5,
            "price": 499.0, "validity_days": 10, "badge": "TEST",
        }
        up = requests.put(f"{API}/admin/plans/{pid}", headers=_h(admin_token), json=body)
        assert up.status_code == 200, up.text
        assert up.json()["id"] == pid
        assert up.json()["price"] == 499.0

        # Verify via public /plans
        public_plans = requests.get(f"{API}/plans").json()
        assert any(p["id"] == pid for p in public_plans)

        # Delete
        de = requests.delete(f"{API}/admin/plans/{pid}", headers=_h(admin_token))
        assert de.status_code == 200
        public_plans2 = requests.get(f"{API}/plans").json()
        assert not any(p["id"] == pid for p in public_plans2)

    def test_admin_settings_get_and_put(self, admin_token):
        r = requests.get(f"{API}/admin/settings", headers=_h(admin_token))
        assert r.status_code == 200
        body = r.json()
        assert "cod_enabled" in body and "delivery_zones" in body

        new_zones = ["560034", "560037", "560100"]
        up = requests.put(f"{API}/admin/settings", headers=_h(admin_token),
                          json={"delivery_zones": new_zones})
        assert up.status_code == 200
        assert up.json()["delivery_zones"] == new_zones

        # Public reflects
        pub = requests.get(f"{API}/settings/public").json()
        assert pub["delivery_zones"] == new_zones


# ---------------- RBAC ----------------
class TestRBAC:
    def test_non_admin_blocked_on_admin_endpoints(self, customer):
        token = customer["token"]
        endpoints = [
            ("GET", f"{API}/admin/menu"),
            ("PUT", f"{API}/admin/menu/2099-02-01"),
            ("DELETE", f"{API}/admin/menu/2099-02-01"),
            ("GET", f"{API}/admin/plans"),
            ("PUT", f"{API}/admin/plans/foo"),
            ("DELETE", f"{API}/admin/plans/foo"),
            ("GET", f"{API}/admin/settings"),
            ("PUT", f"{API}/admin/settings"),
        ]
        for method, url in endpoints:
            kwargs = {"headers": _h(token)}
            if method in ("PUT",):
                # send minimal valid bodies; if RBAC kicks first, body shape doesn't matter
                if "menu" in url:
                    kwargs["json"] = {"date": "2099-02-01", "main_dish": "X"}
                elif "plans" in url:
                    kwargs["json"] = {"name": "X", "description": "X", "meal_count": 1,
                                       "price": 1.0, "validity_days": 1}
                else:
                    kwargs["json"] = {"cod_enabled": True}
            r = requests.request(method, url, **kwargs)
            assert r.status_code == 403, f"{method} {url} expected 403, got {r.status_code}: {r.text}"

    def test_unauthenticated_blocked_on_admin(self):
        r = requests.get(f"{API}/admin/menu")
        assert r.status_code == 401


# ---------------- ORDER TRACKING ----------------
class TestOrderTracking:
    @pytest.fixture(scope="class")
    def cod_order(self, admin_token):
        # ensure COD is enabled
        requests.put(f"{API}/admin/settings", headers=_h(admin_token), json={"cod_enabled": True})
        u = _register_customer()
        from datetime import date as _d
        r = requests.post(f"{API}/orders/create", headers=_h(u["token"]), json={
            "menu_date": _d.today().isoformat(), "payment_mode": "cod", "address": "Track Test",
        })
        assert r.status_code == 200, r.text
        o = r.json()
        return {"order": o, "owner": u}

    def test_track_returns_order_timeline_and_now(self, cod_order):
        owner = cod_order["owner"]
        oid = cod_order["order"]["id"]
        r = requests.get(f"{API}/orders/{oid}/track", headers=_h(owner["token"]))
        assert r.status_code == 200, r.text
        body = r.json()
        assert "order" in body and "timeline" in body and "now" in body
        assert body["order"]["id"] == oid
        timeline = body["timeline"]
        assert isinstance(timeline, list) and len(timeline) >= 4
        labels = [s["label"] for s in timeline]
        assert "Order placed" in labels
        assert "Delivered" in labels
        # "Order placed" should be done initially
        placed = next(s for s in timeline if s["label"] == "Order placed")
        assert placed["state"] == "done"
        # Delivered should be pending
        delivered = next(s for s in timeline if s["label"] == "Delivered")
        assert delivered["state"] == "pending"

    def test_track_forbidden_for_other_user(self, cod_order):
        oid = cod_order["order"]["id"]
        other = _register_customer()
        r = requests.get(f"{API}/orders/{oid}/track", headers=_h(other["token"]))
        assert r.status_code == 403

    def test_track_allowed_for_admin_and_delivery(self, cod_order, admin_token, delivery_token):
        oid = cod_order["order"]["id"]
        ra = requests.get(f"{API}/orders/{oid}/track", headers=_h(admin_token))
        assert ra.status_code == 200
        rd = requests.get(f"{API}/orders/{oid}/track", headers=_h(delivery_token))
        assert rd.status_code == 200

    def test_track_404_for_missing_order(self, customer):
        r = requests.get(f"{API}/orders/does-not-exist/track", headers=_h(customer["token"]))
        assert r.status_code == 404

    def test_track_timeline_updates_with_delivery_status(self, cod_order, delivery_token):
        oid = cod_order["order"]["id"]
        owner_token = cod_order["owner"]["token"]
        # transition to out_for_delivery
        up = requests.post(f"{API}/delivery/update", headers=_h(delivery_token),
                           json={"order_id": oid, "status": "out_for_delivery"})
        assert up.status_code == 200, up.text
        # Customer should now have a "Your tiffin is on the way" notification
        notifs = requests.get(f"{API}/notifications", headers=_h(owner_token)).json()
        titles = [i["title"] for i in notifs["items"]]
        assert any("on the way" in t for t in titles)
        # Track timeline reflects out_for_delivery
        tr = requests.get(f"{API}/orders/{oid}/track", headers=_h(owner_token)).json()
        timeline = tr["timeline"]
        ofd = next(s for s in timeline if s["label"] == "Out for delivery")
        assert ofd["state"] in ("active", "done")
        # deliver with OTP
        otp = cod_order["order"]["cod_otp"]
        de = requests.post(f"{API}/delivery/update", headers=_h(delivery_token),
                           json={"order_id": oid, "status": "delivered", "otp": otp})
        assert de.status_code == 200, de.text
        # Track shows delivered done
        tr2 = requests.get(f"{API}/orders/{oid}/track", headers=_h(owner_token)).json()
        delivered = next(s for s in tr2["timeline"] if s["label"] == "Delivered")
        assert delivered["state"] == "done"
        # Customer should have a "Tiffin delivered" notification
        notifs2 = requests.get(f"{API}/notifications", headers=_h(owner_token)).json()
        titles2 = [i["title"] for i in notifs2["items"]]
        assert any("delivered" in t.lower() for t in titles2)
