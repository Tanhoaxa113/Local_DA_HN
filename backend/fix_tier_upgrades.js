/**
 * Script to fix tier upgrades for existing users
 * Run: node fix_tier_upgrades.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTierUpgrades() {
    console.log('🔧 Fixing tier upgrades for existing users...\n');

    // Get all tiers sorted by minPoints descending
    const tiers = await prisma.memberTier.findMany({
        orderBy: { minPoints: 'desc' },
    });

    console.log('Available tiers:');
    tiers.forEach(t => console.log(`  - ${t.name}: ${t.minPoints}+ points`));
    console.log('');

    // Get all users with their current tier
    const users = await prisma.user.findMany({
        include: { tier: true },
    });

    let upgraded = 0;
    for (const user of users) {
        // Find the highest tier user qualifies for
        const qualifiedTier = tiers.find(t => user.loyaltyPoints >= t.minPoints);

        if (qualifiedTier && qualifiedTier.id !== user.tierId) {
            console.log(`📈 Upgrading ${user.fullName} (${user.email}):`);
            console.log(`   Points: ${user.loyaltyPoints}`);
            console.log(`   ${user.tier.name} → ${qualifiedTier.name}`);

            await prisma.user.update({
                where: { id: user.id },
                data: { tierId: qualifiedTier.id },
            });

            upgraded++;
        }
    }

    console.log(`\n✅ Done! Upgraded ${upgraded} user(s).`);
}

fixTierUpgrades()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
