# ICEC PayPal Smart Buttons Migration

**Date:** 2026-03-30

## Summary

Migrated ICEC2026 registration payment from PayPal NCP (No Code Payment) hosted buttons to PayPal JS SDK Smart Buttons, integrated directly into the WordPress child theme `functions.php`.

## Problem

1. **China access failure**: PayPal NCP pages depend on Google reCAPTCHA, which is blocked in China. Users clicking the payment button saw no response.
2. **No payment verification**: The old system used a self-reported "I've Completed Payment" button — users could claim payment without actually paying.
3. **Registration-payment disconnect**: NCP hosted buttons are external links with no way to pass registration data (Name, Email, Affiliation) back to the system.

## Solution

Replaced PayPal NCP hosted buttons with PayPal REST API + JS SDK Smart Buttons:

- **PayPal JS SDK** renders payment buttons inline on the product page (no external redirect)
- **"Debit or Credit Card" option** allows payment without a PayPal account (critical for China)
- **Server-side order creation** via PayPal Orders API v2, linking `custom_id` = registration ID
- **Server-side capture** on `onApprove` callback — payment verified by PayPal API, not self-reported
- **Webhook endpoint** (`/wp-json/icec/v1/paypal-webhook`) as a safety net for edge cases
- **Automatic confirmation emails** to both registrant and admin on successful payment

## Files Modified

- `/wp-content/themes/hello-elementor-child/functions.php`
  - Added: `ICEC_PAYPAL_MODE`, `ICEC_PAYPAL_CLIENT_ID`, `ICEC_PAYPAL_CLIENT_SECRET` constants
  - Added: `icec_paypal_base_url()`, `icec_paypal_access_token()` helpers
  - Added: `icec_ajax_create_paypal_order` AJAX endpoint
  - Added: `icec_ajax_capture_paypal_order` AJAX endpoint
  - Added: `icec_send_confirmation_email()` function
  - Added: `icec_handle_paypal_webhook()` REST endpoint
  - Replaced: NCP link HTML → Smart Buttons container + fallback UI
  - Replaced: NCP JS (payLinkMap + self-report) → Smart Buttons JS (createOrder + onApprove)
  - Removed: `icec_ajax_payment_complete` (self-reported payment)

## Deliverables

- `C:/Users/seank/Downloads/ICEC_PayPal_설정_가이드.md` — Non-technical setup guide for PayPal Developer configuration
- Modified `functions.php` ready for FTP upload

## Status

- [x] Code complete
- [ ] PayPal Developer app creation (Client ID / Secret)
- [ ] Webhook registration
- [ ] Sandbox testing
- [ ] Live deployment

## Technical Notes

- PayPal Merchant ID: `QAZELNULEPR34`
- PayPal account: `contact@icec.net`
- Product IDs: 5164, 5165, 5166, 5167
- DB table: `wp_icec_registrations` (status field: `pending` → `paid`)
- Korean participants use separate `event-us.kr` payment (unchanged)
