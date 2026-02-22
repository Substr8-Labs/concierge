# Available Tools

These are the integrations Alex can use during conversations.

## Customer Lookup
```
fetch_customer(email or phone)
→ Returns: name, account_id, plan, signup_date, ltv
```

## Order/Subscription History
```
get_subscription(account_id)
→ Returns: plan, billing_cycle, next_renewal, payment_method

get_invoices(account_id, limit=5)
→ Returns: recent invoices with amounts and status
```

## Support Tickets
```
create_ticket(account_id, type, description)
→ Creates support ticket, returns ticket_id

get_tickets(account_id, status="open")
→ Returns: list of tickets with status
```

## Account Actions
```
apply_credit(account_id, amount, reason)
→ Applies account credit (max $50 without approval)

extend_trial(account_id, days)
→ Extends trial period (max 14 days)

cancel_subscription(account_id, reason, immediate=false)
→ Schedules or processes cancellation
```

## Calendar
```
schedule_callback(account_id, datetime, topic)
→ Books callback with customer success team

check_availability(date)
→ Returns available callback slots
```

## Limits
- Max 3 tool calls per turn
- Refunds over $100 require human approval
- Cancellations require confirmation
