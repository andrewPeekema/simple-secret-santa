export function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function isValidAssignment(givers, receivers, exclusions) {
    for (let i = 0; i < givers.length; i++) {
        if (givers[i] === receivers[i]) return false;
        if (exclusions[givers[i]] && exclusions[givers[i]].includes(receivers[i])) return false;
    }
    return true;
}

// Rejection sampling, preserved exactly as it behaved inline. A backtracking
// replacement was considered and dropped: the case was unproven and this
// samples uniformly (two couples in four succeeds on 16.8% of attempts).
// Note the consequence — exhausting maxAttempts means "not found", not
// "impossible", which is stronger than the alert in js/ui/setup.js says.
export function buildAssignment(people, exclusions, maxAttempts = 1000) {
    let attempts = 0;
    while (attempts < maxAttempts) {
        const receivers = shuffle([...people]);
        if (isValidAssignment(people, receivers, exclusions)) return receivers;
        attempts++;
    }
    return null;
}
