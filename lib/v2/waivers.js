const express = require('express');
const router = express.Router();
const knex = require('../../knex');
const confirmationEmail = require('../confirmationEmail');

// Check waiver
router.get('/check', async (req, res) => {
  try {
    const { firstName, lastName, email, count = 1 } = req.query;
    const result = await knex('waivers').where({ firstName, lastName, email });
    const waiver = result[0];

    if (waiver && waiver.waiverId) {
      await knex('checkin').insert({ waiverId: waiver.waiverId, count });
    }

    waiver.accept = true;
    waiver.signature = !!waiver.signature;

    // Remove unnecessary fields
    delete waiver.createdAt;
    delete waiver.updatedAt;
    delete waiver.parentFirstName;
    delete waiver.parentLastName;
    delete waiver.parentEmail;

    res.json(waiver);
  } catch (error) {
    res.status(500).json({ message: 'Failed to check waiver.', error });
  }
});

// Count waivers
router.get('/count', async (req, res) => {
  const { startDate = undefined } = req.query;

  let query = knex('waivers')
    .select('convention')
    .groupBy('convention');

  if (startDate) {
    query
      .where('createdAt', '>=', knex.raw('date(?)', [ startDate ]))
      .andWhere('createdAt', '<', knex.raw('date(?, "+5 days")', [ startDate ]));
  } else {
    query.where('createdAt', '>', knex.raw('date("now", "-5 days")'));
  }

  query.count('* as count');

  const results = await query;
  return res.json(results);
});

// Create waiver
router.post('/', async (req, res, next) => {
  try {
    const {
      waiver: {
        firstName,
        lastName,
        birthday,
        email,
        accept = false,
        signature,
        adult = false,
        convention = '',
        dependents = []
      }
    } = req.body;

    if (!accept) {
      return res.status(409).json({ message: 'Must agree to terms.' })
    }

    const checkBirthday = new Date(birthday);
    const now = new Date();
    const yearInMs = 1000 * 60 * 60 * 24 * 365;
    const isAdult = (now - checkBirthday) / yearInMs >= 18;

    if (!adult || !isAdult) {
      return res.status(400).json({ message: 'No adult participant found.' });
    }

    let records = {
      firstName,
      lastName,
      email: email.toLowerCase(),
      birthday: birthday.slice(0, 10),
      signature,
      convention
    };

    if (dependents && dependents.length > 1) {
      records = [ records ];
      dependents.forEach(child => {
        records.push({
          firstName: child.first_name,
          lastName: child.last_name,
          email: child.email && child.email.toLowerCase() || email.toLowerCase(),
          birthday: child.birthday.slice(0, 10),
          signature,
          convention,
          parentFirstName: firstName,
          parentLastName: lastName,
          parentEmail: email.toLowerCase()
        });
      });
    }

    try {
      const { result: [ waiverId ] } = await knex('waivers').insert(records);
    } catch (error) {
      if (error.code !== 'SQLITE_CONSTRAINT') {
        throw error;
      }
    }
    const waivers = await knex('waivers')
      .where({
        firstName,
        lastName,
        email: email.toLowerCase()
      })
      .orWhere({
        parentFirstName: firstName,
        parentLastName: lastName,
        parentEmail: email.toLowerCase()
      });

    for (let waiver of waivers) {
      if (waiver.waiverId) {
        waiver.accept = true;
        waiver.signature = true;
        await knex('checkin').insert({ waiverId: waiver.waiverId });
        try {
          // noinspection ES6MissingAwait
          confirmationEmail.send(waiver);
        } catch (e) {
        }
      }
    }

    return res.status(201).json({ waiver: waivers });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});

// Fetch all waivers
router.get('/', async (req, res) => {
  try {
    const { convention = '', email = '', search = '', limit = 100, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    // Base query for fetching waivers
    const query = knex
      .select(knex.raw(`*, datetime(created_at, '-5 hours') as created_at`))
      .from('waivers')
      .orderBy('waiverId', 'desc');

    // Apply filters
    if (convention !== '') {
      query.where('convention', 'LIKE', `%${convention}%`);
    }

    if (email !== '') {
      query.where('email', 'LIKE', `%${email}%`);
    }

    if (search !== '') {
      query.where(function () {
        this.where('firstName', 'LIKE', `%${search}%`)
          .orWhere('lastName', 'LIKE', `%${search}%`)
          .orWhere('email', 'LIKE', `%${search}%`);
      });
    }

    // Clone the query to get total count
    const countQuery = query.clone().clearSelect().clearOrder().count('waiverId as total').first();

    // Execute both queries concurrently
    const [ waivers, countResult ] = await Promise.all([
      query.limit(limit).offset(offset),
      countQuery
    ]);

    const totalRecords = countResult.total;
    const totalPages = Math.ceil(totalRecords / limit);

    if (email !== '' && waivers && waivers[0]?.waiverId) {
      await knex('checkin').insert({ waiverId: waivers[0].waiverId });
    }

    return res.json({
      waivers,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalRecords,
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error, message: error.message });
  }
});

// Get totals
router.get('/totals', async (req, res) => {
  console.log('Totals');
  let query = knex.raw(`
      SELECT date(c.created_at, '-5 hours') as date,
             c.convention,
             count(distinct c.waiver_id)    as count
      FROM checkin c
               JOIN waivers w ON c.waiver_id = w.waiver_id
      GROUP BY date(c.created_at, '-5 hours'), w.convention
      ORDER BY date(c.created_at, '-5 hours') DESC, w.convention
  `);

  const totals = await query;
  return res.json({ totals });
});

module.exports = router;
