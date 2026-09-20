import { escapeHtml, copyToClipboard } from './dom.js';
import { encodeAssignment } from '../format.js';
import { buildAssignment } from '../assign.js';
import { isValidName, getInvalidNameReason } from '../validate.js';
import { makeSalt } from '../secret.js';

// The per-session salt shared by every link in this group. Public by design —
// see makeSalt() in js/secret.js for why.
let sessionSalt = makeSalt();
export function getSessionSalt() { return sessionSalt; }

export function addPerson() {
    const peopleList = document.getElementById('peopleList');
    const div = document.createElement('div');
    div.className = 'person-input';
    div.innerHTML = `
        <input type="text" placeholder="Enter name" class="person-name">
        <button class="remove-btn" onclick="this.parentElement.remove(); updateExclusionDropdowns();">Remove</button>
    `;
    peopleList.appendChild(div);
}

export function addExclusion() {
    const exclusionsList = document.getElementById('exclusionsList');
    const div = document.createElement('div');
    div.className = 'exclusion-row';
    div.innerHTML = `
        <select class="person1-select">
            <option value="">Select person...</option>
        </select>
        <span class="arrow">↔</span>
        <select class="person2-select">
            <option value="">Select person...</option>
        </select>
        <button class="remove-exclusion-btn" onclick="this.parentElement.remove()">Remove</button>
    `;
    exclusionsList.appendChild(div);
    updateExclusionDropdowns();
}

export function updateExclusionDropdowns() {
    const inputs = document.querySelectorAll('.person-name');
    const people = [];

    inputs.forEach(input => {
        const name = input.value.trim();
        if (name) people.push(name);
    });

    const selects = document.querySelectorAll('.person1-select, .person2-select');
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select person...</option>';
        people.forEach(person => {
            const option = document.createElement('option');
            option.value = person;
            option.textContent = person;
            if (person === currentValue) option.selected = true;
            select.appendChild(option);
        });
    });
}

export function getExclusions() {
    const exclusions = {};
    const rows = document.querySelectorAll('.exclusion-row');

    rows.forEach(row => {
        const person1 = row.querySelector('.person1-select').value;
        const person2 = row.querySelector('.person2-select').value;

        if (person1 && person2 && person1 !== person2) {
            if (!exclusions[person1]) exclusions[person1] = [];
            if (!exclusions[person2]) exclusions[person2] = [];

            if (!exclusions[person1].includes(person2)) exclusions[person1].push(person2);
            if (!exclusions[person2].includes(person1)) exclusions[person2].push(person1);
        }
    });

    return exclusions;
}

export function generateSecretSanta() {
    updateExclusionDropdowns();

    const inputs = document.querySelectorAll('.person-name');
    const people = [];

    inputs.forEach(input => {
        const name = input.value.trim();
        if (name) people.push(name);
    });

    if (people.length < 3) {
        alert('You need at least 3 people for Secret Santa!');
        return;
    }

    if (new Set(people).size !== people.length) {
        alert('Please make sure all names are unique!');
        return;
    }

    // Validate all names for allowed characters
    for (const name of people) {
        if (!isValidName(name)) {
            const reason = getInvalidNameReason(name);
            alert(`Invalid name "${name}": ${reason}\n\nNames can contain letters, numbers, spaces, apostrophes, hyphens, and periods.`);
            return;
        }
    }

    // Check for case-insensitive duplicates
    const lowerCaseNames = people.map(n => n.toLowerCase());
    const lowerCaseSet = new Set(lowerCaseNames);
    if (lowerCaseSet.size !== people.length) {
        const duplicates = people.filter((name, i) =>
            lowerCaseNames.indexOf(name.toLowerCase()) !== i
        );
        if (!confirm(`Warning: Some names differ only by capitalization (e.g., "${duplicates[0]}"). This might cause confusion. Continue anyway?`)) {
            return;
        }
    }

    const exclusions = getExclusions();

    for (let person of people) {
        const excluded = exclusions[person] || [];
        if (excluded.length >= people.length - 1) {
            alert(`${person} has too many exclusions! They need at least one person they can give to.`);
            return;
        }
    }

    sessionSalt = makeSalt();

    const givers = [...people];
    const receivers = buildAssignment(people, exclusions);

    if (!receivers) {
        alert('Could not generate a valid Secret Santa with these exclusions. Try removing some exclusion rules.');
        return;
    }

    const assignments = {};
    for (let i = 0; i < givers.length; i++) {
        const data = {
            giver: givers[i],
            receiver: receivers[i],
            salt: sessionSalt
        };
        assignments[givers[i]] = {
            encoded: encodeAssignment(data)
        };
    }

    displayResults(assignments);
}

export function displayResults(assignments) {
    const linksList = document.getElementById('linksList');
    linksList.innerHTML = '';

    const people = Object.keys(assignments);

    // Store for Copy All function
    window.generatedLinks = [];

    // Set success banner
    const successBanner = document.getElementById('successBanner');
    successBanner.textContent = `✓ ${people.length} links ready to share`;

    people.forEach(person => {
        const url = window.location.origin + window.location.pathname +
                   '#' + assignments[person].encoded;

        // Store for Copy All
        window.generatedLinks.push({ name: person, url: url });

        const div = document.createElement('div');
        div.className = 'link-item';

        const inputId = 'link-' + Math.random().toString(36).substring(2, 8);

        div.innerHTML = `
            <strong>${escapeHtml(person)}'s link</strong>
            <input type="text" value="${escapeHtml(url)}" readonly id="${inputId}">
            <button class="copy-btn" onclick="copyToClipboard(document.getElementById('${inputId}').value, this)">Copy Link</button>
        `;

        linksList.appendChild(div);
    });

    const resultsDiv = document.getElementById('results');
    resultsDiv.style.display = 'block';

    // Auto-scroll to results
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function copyAllLinks() {
    if (!window.generatedLinks || window.generatedLinks.length === 0) return;

    const text = window.generatedLinks
        .map(item => `${item.name}'s link:\n${item.url}`)
        .join('\n\n');

    copyToClipboard(text, document.getElementById('copyAllBtn'));
}
