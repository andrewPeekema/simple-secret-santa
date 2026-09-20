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

// Rejection sampling, preserved exactly as it behaved inline. Sub-project 2
// replaces this with backtracking, which reports impossibility definitively
// rather than giving up after a fixed number of attempts.
export function buildAssignment(people, exclusions, maxAttempts = 1000) {
    let attempts = 0;
    while (attempts < maxAttempts) {
        const receivers = shuffle([...people]);
        if (isValidAssignment(people, receivers, exclusions)) return receivers;
        attempts++;
    }
    return null;
}
