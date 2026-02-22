# Available Tools

## CRM

### fetch_customer(id)
Returns customer account details:
- Name, email, phone
- Account tier (standard, gold, platinum)
- Lifetime value
- Open tickets

### update_customer(id, fields)
Update customer profile:
- Contact preferences
- Address
- Name

## Orders

### get_orders(customer_id, limit)
Returns recent orders:
- Order ID, date, total
- Status (processing, shipped, delivered)
- Items

### get_order_details(order_id)
Returns full order:
- Line items
- Shipping address
- Tracking number
- Payment method (last 4 only)

### check_tracking(order_id)
Returns shipping status:
- Carrier
- Tracking number
- Current location
- Estimated delivery

### initiate_refund(order_id, reason, amount?)
Process refund:
- Full refund if no amount specified
- Partial refund if amount given
- **Requires:** reason field
- **Limit:** $100 without approval

## Support

### create_ticket(customer_id, type, description)
Open support ticket:
- Types: billing, shipping, product, general
- Returns ticket ID

### schedule_callback(customer_id, datetime, notes)
Book a callback:
- Checks agent availability
- Sends confirmation to customer
- Returns confirmation ID

### escalate_to_human(customer_id, reason)
Transfer to human agent:
- Notifies support queue
- Passes conversation context
- Returns queue position

## Limits

- Max 5 tool calls per conversation turn
- Refunds over $100 require human approval
- Can't modify orders in "shipped" status
- Can't access payment details (PCI compliance)
