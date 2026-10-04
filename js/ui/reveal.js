import { escapeHtml, STARS_HTML } from './dom.js';
import { simpleHash } from '../secret.js';
import { getSessionSalt } from './setup.js';

export function revealAssignment(data) {
    document.getElementById('mainContainer').style.display = 'none';
    document.getElementById('setupSection').style.display = 'none';
    document.getElementById('hintsSection').style.display = 'none';
    document.getElementById('viewHintsSection').style.display = 'none';
    const revealSection = document.getElementById('revealSection');
    revealSection.style.display = 'block';

    const hintPassword = simpleHash('pair-' + data.receiver + '-' + (data.salt || getSessionSalt())).padStart(6, '0').substring(0, 6);

    const safeGiver = escapeHtml(data.giver);
    const safeReceiver = escapeHtml(data.receiver);
    const safeSalt = escapeHtml(data.salt || getSessionSalt());

    // Store raw values for wishlist creation to ensure password consistency
    window.revealData = {
        giver: data.giver,
        salt: data.salt || getSessionSalt()
    };

    revealSection.innerHTML = `
        ${STARS_HTML}
        <p class="secondary">Hello, ${safeGiver}. You're giving a gift to</p>
        <h1 class="recipient mt-2">${safeReceiver}</h1>

        <hr class="sep">

        <p class="kv"><span class="secondary">Wishlist password</span><span class="password">${hintPassword}</span></p>
        <p class="note mt-2">You'll need it to open ${safeReceiver}'s wishlist, if they share one.</p>

        <hr class="sep">

        <button class="btn btn--primary btn--block" onclick="showCreateHints(window.revealData.giver, window.revealData.salt)">Create your wishlist</button>
        <p class="note mt-2">Share hints with your own Secret Santa.</p>

        <p class="nav"><button class="link" onclick="location.href=location.pathname">Start a new exchange</button></p>
    `;
}
