const pool = require('../config/db');

/**
 * Calculates the membership level based on total spent amount.
 * 
 * Target criteria:
 * - 0 - 5,000 : bronze
 * - 5,001 - 15,000 : silver
 * - 15,001 - 30,000 : gold
 * - 30,001+ : platinum
 * 
 * @param {number} totalSpent - The total spent amount by the customer
 * @returns {string} The calculated membership level ENUM string
 */
const calculateMemberLevel = (totalSpent) => {
    if (totalSpent > 30000) return 'platinum';
    if (totalSpent > 15000) return 'gold';
    if (totalSpent > 5000) return 'silver';
    return 'bronze';
};

/**
 * Recalculates and updates a customer's member_level in the database based on their current total_spent.
 * Should be called whenever total_spent is modified.
 * 
 * @param {number} customerId - The customer ID to update
 * @param {object} [conn] - Optional database connection/transaction object to use
 */
const updateCustomerMembership = async (customerId, conn = pool) => {
    try {
        const [[customer]] = await conn.query('SELECT total_spent FROM customers WHERE id = ?', [customerId]);
        if (!customer) return;

        const newLevel = calculateMemberLevel(Number(customer.total_spent || 0));
        await conn.query('UPDATE customers SET member_level = ? WHERE id = ?', [newLevel, customerId]);
        
        return newLevel;
    } catch (err) {
        console.error(`[MembershipUpdater] Error updating tier for customer ${customerId}:`, err);
    }
};

module.exports = { calculateMemberLevel, updateCustomerMembership };
