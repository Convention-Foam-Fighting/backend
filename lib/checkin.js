const knex = require('../knex');

const totals = async (req, res) => {
  let query = knex.raw(`
    SELECT 
        date(created_at) as date, 
        count(distinct waiver_id) as count
    FROM checkin
    ORDER BY created_at DESC;
  `);

  const totals = await query;
  return res.json({ totals });
};

module.exports = {
  totals
};
