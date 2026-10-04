# Wishlist URL cleanup — spec §6 walk-through (2026-10-04)

Where: the VM copy of `main @ ca2e174` at `https://notes.app.andrewpeekema.com:9443/ota/brainstorm/secret-santa/`,
verified byte-identical to the checkout (md5 of `index.html`, `css/`, `js/`) before the check. Performed by the user
on a phone; observed text reported back verbatim.

Input pasted into the wishlist textarea:

    Socks https://www.amazon.com/Darn-Tough-Hiker/dp/B01N1LQ5S2/ref=sr_1_3?keywords=wool+socks&th=1&psc=1.
    Mug (https://www.etsy.com/listing/1234567890/handmade-mug?ref=shop_home&variation0=4321).
    Shirt https://shop.example.com/flannel?size=M&utm_source=ig

Textarea after Generate (user's report):

    Socks https://www.amazon.com/dp/B01N1LQ5S2.
    Mug (https://www.etsy.com/listing/1234567890?variation0=4321).
    Shirt https://shop.example.com/flannel?size=M

Matches spec §2.2 and the B1 ruling: Amazon to `/dp/<ASIN>` with the sentence full stop kept outside the URL;
Etsy to `/listing/<id>` keeping `variation0` and both parentheses; the unknown host keeps `size=M` and loses only
`utm_source`. The same input through `tidyUrls` in node gives the identical text (director, before merge).

Not separately confirmed in this walk-through: the "Shortened 3 links." line and the Back/decoded-view screens
(the user judged the result good at the textarea step). The suite's text guard pins the wiring; 142/142 on main.
