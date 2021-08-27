const knex = require('../knex');

const count = async (req, res) => {
  const { waiverId } = req.body;

  try {
    await knex('checkin').insert({ waiverId });

    return res.json({ message: 'Checkin successfully!' });
  } catch(error) {
    return res.status(500).json({ message: 'Failed to check in.', error })
  }
};

const totals = async (req, res) => {
  const { startDate } = req.query;

  let query = knex('checkin').select('date(createdAt) as date, count(distinct waiver_id) as count');

  if (startDate) {
    query
      .where('createdAt', '<', `date('${startDate}')`)
      .andWhere('createdAt', '>', `date('${startDate}', '+4 days')`)
  } else {
    query.where('createdAt', '>', 'date("now", "-4 days")');
  }

  const totals = await query;
  return res.json({ totals });
};

module.exports = {
  count,
  totals
};
