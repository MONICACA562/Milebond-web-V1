# Quote email template (with UTM tracking)

Internal ops document — not deployed to the website.

Every outbound quote email should carry UTM parameters so the inquiry it produces can be
traced back to that specific message. Without them, the lead arrives as `direct` in GA4 and
in the inquiry notification email.

---

## 1. UTM conventions

| Channel | utm_source | utm_medium | utm_campaign | utm_content |
|---|---|---|---|---|
| Quote email | `email` | `quote` | quote number, e.g. `mbd112026n0174` | `product` / `cta` |
| PDF quotation | `pdf` | `quotation` | quote number | `product` |
| WhatsApp outreach | `whatsapp` | `outreach` | client short name | `product` |
| LinkedIn | `linkedin` | `social` | content topic | `post` |

Rules:

- `utm_campaign` must be unique per message — use the quote number.
- Write it in lowercase, always the same way (`mbd112026n0174`, not `MBD112026N0174`),
  otherwise GA4 counts them as two different campaigns.
- Several links in one email: distinguish them with `utm_content`.
- Never wrap these links in a shortener — the redirect drops the parameters.

---

## 2. Email template

Plain text beats heavy HTML here: better deliverability, and it reads like a person wrote it.

```
Subject: Your quote — {{ProductName}} ({{KeySpec}}), EXW US${{Price}}/{{Unit}}

Hi {{FirstName}},

Thanks for your interest in {{ProductName}}. Here is the quote for {{QuoteNo}}.

WHATS INCLUDED
- Product:      {{ProductName}}
- Material:     {{Material}}
- Size:         {{Size}}
- Resistance:   {{Resistance}}
- Price:        EXW US${{Price}} per {{Unit}} ({{PackNote}})
- Sample:       US${{SamplePrice}} per {{Unit}}, ships in {{SampleDays}} days
- Carton:       {{SetsPerCarton}} sets · {{CBM}} CBM · {{GrossKg}} kg gross
- Lead time:    {{LeadTime}}
- HS code:      {{HSCode}} · {{ImportDuty}}
- Options:      {{CustomOptions}}

Full spec, photos and packing details:
https://www.milebond.com{{ProductPath}}?utm_source=email&utm_medium=quote&utm_campaign={{QuoteNoLower}}&utm_content=product

If the numbers work, I can send a sample this week so you can check the material and
finish yourself before any bulk order:
https://www.milebond.com/free-quote?utm_source=email&utm_medium=quote&utm_campaign={{QuoteNoLower}}&utm_content=cta

Any question about {{ConcernTopic}}, just reply to this email — it comes straight to me.

Best regards,
Monica Zhu
Founder & CEO, Milebond — Yiwu, China
info@milebond.com · +86 150 5796 0102
WhatsApp: https://wa.me/8615057960102

P.S. {{PSLine}}
```

### Placeholders

| Placeholder | Value |
|---|---|
| `{{ProductName}}` | product name from the quotation sheet |
| `{{KeySpec}}` | the one spec buyers scan for, e.g. `5 loops, 10–40 lbs` |
| `{{Price}}` / `{{Unit}}` | EXW price and unit, e.g. `0.92` / `set` |
| `{{PackNote}}` | packing included in the price, e.g. `5 bands, PP bag` |
| `{{SamplePrice}}` / `{{SampleDays}}` | sample cost and dispatch time |
| `{{SetsPerCarton}}` / `{{CBM}}` / `{{GrossKg}}` | carton data |
| `{{HSCode}}` / `{{ImportDuty}}` | HS code and duty/VAT line |
| `{{CustomOptions}}` | add-on pricing, e.g. colour box, logo |
| `{{ConcernTopic}}` | the one thing this buyer actually cares about |
| `{{QuoteNoLower}}` | quote number, lowercase |
| `{{PSLine}}` | one concrete nudge, not a generic slogan |

---

## 3. Worked example — MBD112026N0174

```
Subject: Your quote — TPE resistance bands set (5 loops, 10–40 lbs), EXW US$0.92/set

Hi Sacha,

Thanks for your interest in the TPE yoga resistance bands set. Here is the quote for MBD112026N0174.

WHATS INCLUDED
- Product:      5-band TPE resistance band set (colour-coded)
- Material:     TPE, latex-free
- Size:         600 × 50 mm per loop, 0.35–1.1 mm thick
- Resistance:   10 / 15 / 20 / 30 / 40 lbs, printed on each band
- Price:        EXW US$0.92 per set (5 bands, PP bag)
- Sample:       US$1 per set, ships in 3–5 days
- Carton:       100 sets · 0.03 CBM · 12.8 kg gross
- Lead time:    In stock
- HS code:      3926909790 · EU MFN duty 6.5%, France VAT 20%
- Options:      Colour box +US$0.16/set · custom logo +US$0.05/set

Full spec, photos and packing data:
https://www.milebond.com/products/sports-outdoors/yoga-resistance-bands-latex-loop-set/?utm_source=email&utm_medium=quote&utm_campaign=mbd112026n0174&utm_content=product

If the numbers work, I can send a sample this week so you can check the material and
finish before any bulk order:
https://www.milebond.com/free-quote?utm_source=email&utm_medium=quote&utm_campaign=mbd112026n0174&utm_content=cta

For reference, air DDP to Paris is quoted from US$29.69/kg, about 20 days door to door —
I can price sea freight once the volume is confirmed.

Best regards,
Monica Zhu
Founder & CEO, Milebond — Yiwu, China
info@milebond.com · +86 150 5796 0102

P.S. If 0.92 works for you, the next step is the colour box — it usually lifts retail
price more than it costs at +US$0.16.
```

---

## 4. Checklist before sending

- [ ] `utm_campaign` is the quote number, lowercase
- [ ] Both links open the right page (test them once)
- [ ] No shortener used
- [ ] The spec numbers match the quotation sheet
- [ ] One concrete P.S., not a slogan

---

## 5. Where the data ends up

The site records the first landing page, referrer and UTM for 30 days
(`functions/_middleware.js`), and attaches them to the inquiry
(`assets/quote-form.js` → `functions/api/inquiry.js`). The notification email to
info@milebond.com shows:

```
Traffic source: email / quote
Entry page: /products/sports-outdoors/yoga-resistance-bands-latex-loop-set/?utm_source=email...
Referrer: ...
First visit: 2026-11-20
UTM: utm_source=email | utm_medium=quote | utm_campaign=mbd112026n0174 | utm_content=product
```

If an inquiry shows `Traffic source: direct`, that message was sent without UTM — or the
buyer typed the address from a PDF that was not tracked.
