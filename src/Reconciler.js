
/**
 * FINITE LOGIC - InfraSeal: Configuration Drift Preventer
 * Compares desired state (IaC) with live state and calculates a severity score.
 */

// Weights for calculating the Severity Score (Higher weight = more critical change)
const SEVERITY_WEIGHTS = {
    SECURITY_GROUP_CHANGE: 5,
    DATABASE_VERSION_CHANGE: 4,
    MINOR_PATCH_LEVEL: 1,
    TAG_CHANGE: 0.5
};

/**
 * Compares two state objects and returns a detailed drift report.
 * @param {object} declaredState The desired state (from IaC).
 * @param {object} liveState The current state (from cloud API).
 * @returns {Array<{key: string, severity: number, change: string}>}
 */
function compareStates(declaredState, liveState) {
    const report = [];

    // Helper to check for deep changes (simplified)
    const compare = (key, dVal, lVal) => {
        if (JSON.stringify(dVal) !== JSON.stringify(lVal)) {
            let severity = SEVERITY_WEIGHTS.MINOR_PATCH_LEVEL;
            let changeType = "GENERIC_CHANGE";

            // Specialized severity logic
            if (key.includes('securityGroup')) {
                severity = SEVERITY_WEIGHTS.SECURITY_GROUP_CHANGE;
                changeType = "SECURITY_GROUP_CHANGE";
            } else if (key.includes('dbVersion')) {
                severity = SEVERITY_WEIGHTS.DATABASE_VERSION_CHANGE;
                changeType = "DATABASE_VERSION_CHANGE";
            }

            report.push({
                key: key,
                change: changeType,
                severity: severity,
                declared: dVal,
                live: lVal
            });
        }
    };

    // Recursive deep comparison (Simplified for demo)
    const keys = new Set([...Object.keys(declaredState), ...Object.keys(liveState)]);
    for (const key of keys) {
        compare(key, declaredState[key], liveState[key]);
    }
    
    return report;
}

class InfraSealReconciler {
    constructor(declaredState) {
        this.declaredState = declaredState;
    }

    analyzeDrift(liveState) {
        const driftReport = compareStates(this.declaredState, liveState);
        
        let totalSeverity = driftReport.reduce((sum, item) => sum + item.severity, 0);
        
        let recommendation = '✅ No Significant Drift. Stable.';
        if (totalSeverity > 5) {
            recommendation = '⚠️ Severe Drift Detected. Requires manual investigation (Rollback recommended).';
        } else if (totalSeverity > 1) {
            recommendation = '🟡 Minor Drift Detected. Forward-apply safely recommended.';
        }

        console.log(`[InfraSeal] Drift Analysis Complete.`);
        console.log(`Total Severity Score: ${totalSeverity.toFixed(2)}`);
        console.log(`Recommendation: ${recommendation}`);
        return { totalSeverity, recommendation, driftReport };
    }
}

// --- Demonstration ---
const iaC = {
    env: 'production',
    dbVersion: 'postgres-14.5',
    securityGroup: ['allow_ssh', 'allow_web'],
    tags: { owner: 'akshaya', cost_center: 'voryx' }
};

// State as reported by the Live Cloud API:
const liveStateWithDrift = {
    env: 'production',
    dbVersion: 'postgres-15.0', // Drift: Major version change (High Severity)
    securityGroup: ['allow_ssh'], // Drift: Firewall rule missing (Critical Severity)
    tags: { owner: 'akshaya', cost_center: 'voryx', temp_tag: 'test' } // Drift: Extra tag (Low Severity)
};

const reconciler = new InfraSealReconciler(iaC);

console.log('--- InfraSeal: Drift Analysis ---');
reconciler.analyzeDrift(liveStateWithDrift);

module.exports = { InfraSealReconciler };
