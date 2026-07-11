"""Allowance payout lifecycle: request (deduct) -> paid / cancelled (refund)."""
from conftest import auth, make_kid, set_kid_points


def _summary(client, token, kid_id):
    res = client.get(f"/api/allowance/summary/{kid_id}", headers=auth(token))
    assert res.status_code == 200, res.text
    return res.json()


def _request_payout(client, token, kid_id, points, method="cash"):
    return client.post(
        f"/api/allowance/convert/{kid_id}",
        json={"points_to_convert": points, "payout_method": method},
        headers=auth(token),
    )


def test_payout_request_deducts_points_and_computes_dollars(client, parent_token):
    kid = make_kid(client, parent_token)
    set_kid_points(kid["id"], 500)

    res = _request_payout(client, parent_token, kid["id"], 200)
    assert res.status_code == 200, res.text
    payout = res.json()
    # default settings: 100 points per dollar
    assert payout["points_converted"] == 200
    assert payout["dollar_amount"] == 2.0
    assert payout["status"] == "pending"

    assert _summary(client, parent_token, kid["id"])["current_points"] == 300


def test_payout_rejects_more_points_than_balance(client, parent_token):
    kid = make_kid(client, parent_token)
    set_kid_points(kid["id"], 50)
    res = _request_payout(client, parent_token, kid["id"], 100)
    assert res.status_code == 400


def test_payout_rejects_non_positive_points(client, parent_token):
    kid = make_kid(client, parent_token)
    set_kid_points(kid["id"], 100)
    # Field(gt=0): 0 and negatives are schema-rejected (a negative would ADD points)
    assert _request_payout(client, parent_token, kid["id"], 0).status_code == 422
    assert _request_payout(client, parent_token, kid["id"], -50).status_code == 422


def test_cancel_refunds_points(client, parent_token):
    kid = make_kid(client, parent_token)
    set_kid_points(kid["id"], 300)
    payout = _request_payout(client, parent_token, kid["id"], 100).json()
    assert _summary(client, parent_token, kid["id"])["current_points"] == 200

    res = client.post(f"/api/allowance/payouts/{payout['id']}/cancel", headers=auth(parent_token))
    assert res.status_code == 200, res.text
    assert _summary(client, parent_token, kid["id"])["current_points"] == 300


def test_mark_paid_finalizes_payout(client, parent_token):
    kid = make_kid(client, parent_token)
    set_kid_points(kid["id"], 300)
    payout = _request_payout(client, parent_token, kid["id"], 100).json()

    res = client.post(
        f"/api/allowance/payouts/{payout['id']}/pay",
        json={"paid_by": "Pytest Parent"},
        headers=auth(parent_token),
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["status"] == "paid"
    assert body["paid_by"] == "Pytest Parent"
    # No refund on paid
    assert _summary(client, parent_token, kid["id"])["current_points"] == 200
