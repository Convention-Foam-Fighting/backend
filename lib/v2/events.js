const express = require('express');
const router = express.Router();
const knex = require('../../knex');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Validation function
const validateEventData = ({ name, start_date, end_date, timezone }) => {
  const errors = [];
  if (!name) errors.push('Name is required');
  if (!start_date) errors.push('Start date is required');
  if (!end_date) errors.push('End date is required');
  if (!timezone) errors.push('Timezone is required');
  if (new Date(start_date) > new Date(end_date)) errors.push('Start date must be before end date');
  return errors;
};

// Create a new event
router.post('/', upload.single('logo'), async (req, res) => {
  try {
    const { name, start_date, end_date, timezone } = req.body;

    console.log('Received data:', { name, start_date, end_date, timezone, file: req.file });

    const validationErrors = validateEventData({ name, start_date, end_date, timezone });
    if (validationErrors.length > 0) {
      return res.status(400).json({ errors: validationErrors });
    }

    const [ id ] = await knex('events').insert({
      name,
      start_date,
      end_date,
      timezone,
      logo_url: req.file ? `/uploads/${req.file.filename}` : null
    });

    const newEvent = await knex('events').where({ id }).first();
    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    if (error.code === 'SQLITE_CONSTRAINT') {
      res.status(400).json({ error: 'A constraint violation occurred. Please check your input.' });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred while creating the event.' });
    }
  }
});

// Get all events with pagination
router.get('/', async (req, res) => {
  try {
    const { limit = 100, page = 1, search = '' } = req.query;
    const offset = (page - 1) * limit;

    // Base query for fetching events
    const query = knex('events')
      .orderBy('start_date', 'asc')
      .orderBy('name', 'asc');

    // Apply search filter if provided
    if (search !== '') {
      query.where(function() {
        this.where('name', 'LIKE', `%${search}%`)
          .orWhere('timezone', 'LIKE', `%${search}%`);
      });
    }

    // Clone the query to get total count
    const countQuery = query.clone().clearSelect().clearOrder().count('id as total').first();

    // Execute both queries concurrently
    const [ events, countResult ] = await Promise.all([
      query.limit(limit).offset(offset),
      countQuery
    ]);

    const totalRecords = countResult.total;
    const totalPages = Math.ceil(totalRecords / limit);

    res.json({
      events,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalRecords,
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'An unexpected error occurred while fetching events.' });
  }
});

// Get a specific event
router.get('/:id', async (req, res) => {
  try {
    const event = await knex('events').where({ id: req.params.id }).first();
    if (event) {
      res.json(event);
    } else {
      res.status(404).json({ error: 'Event not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update an event
router.put('/:id', upload.single('logo'), async (req, res) => {
  try {
    const { name, start_date, end_date, timezone } = req.body;

    console.log('Received data for update:', { name, start_date, end_date, timezone, file: req.file });

    const validationErrors = validateEventData({ name, start_date, end_date, timezone });
    if (validationErrors.length > 0) {
      return res.status(400).json({ errors: validationErrors });
    }

    const updated = await knex('events')
      .where({ id: req.params.id })
      .update({
        name,
        start_date,
        end_date,
        timezone,
        ...(req.file && { logo_url: `/uploads/${req.file.filename}` })
      });

    if (updated) {
      const updatedEvent = await knex('events').where({ id: req.params.id }).first();
      res.json(updatedEvent);
    } else {
      res.status(404).json({ error: 'Event not found' });
    }
  } catch (error) {
    console.error('Error updating event:', error);
    if (error.code === 'SQLITE_CONSTRAINT') {
      res.status(400).json({ error: 'A constraint violation occurred. Please check your input.' });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred while updating the event.' });
    }
  }
});

// Update past event checkins and waivers
router.post('/:id/update-past', async (req, res) => {
  const { id } = req.params;
  const { timezone } = req.body;

  try {
    const event = await knex('events').where({ id }).first();
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await knex.transaction(async trx => {
      const checkinUpdate = {
        convention: event.name,
        ...(timezone && { timezone }),
      };
      await trx('checkin')
        .where('created_at', '<', event.end_date)
        .whereNull('convention')
        .update(checkinUpdate);

      const waiverUpdate = {
        convention: event.name,
        ...(timezone && { timezone }),
      };
      await trx('waivers')
        .where('created_at', '<', event.end_date)
        .whereNull('convention')
        .update(waiverUpdate);
    });

    res.json({ message: 'Past event checkins and waivers updated successfully' });
  } catch (error) {
    console.error('Error updating past event data:', error);
    res.status(500).json({ error: 'Failed to update past event data' });
  }
});

// Get event logo
router.get('/:id/logo', async (req, res) => {
  try {
    console.log('WTF')
    const { id } = req.params;
    console.log(id)
    const event = await knex('events').where({ id }).first();
    console.log(event)
    if (event && event.logoUrl) {
      res.sendFile(path.join(__dirname, '..', '..', event.logoUrl));
    } else {
      res.status(404).json({ error: 'Logo not found' });
    }
  } catch (error) {
    console.error('Error retrieving logo:', error);
    res.status(500).json({ error: 'An error occurred while retrieving the logo' });
  }
});

module.exports = router;
