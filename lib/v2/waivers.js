const knex = require('../../knex');
const confirmationEmail = require('../confirmationEmail');

const check = async (req, res) => {
  try {
    const {firstName, lastName, email} = req.query;
    const result = await knex('waivers').where({firstName, lastName, email});
    const waiver = result[0];

    if (waiver && waiver.waiverId) {
      await knex('checkin').insert({waiverId: waiver.waiverId});
    }

    if (waiver.parentFirstName && waiver.parentLastName && waiver.parentEmail) {
      waiver.parent = {
        firstName: waiver.parentFirstName,
        lastName: waiver.parentLastName,
        email: waiver.parentEmail
      };
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
    res.status(500).json({message: 'Failed to check waiver.', error});
  }
};

const create = async (req, res, next) => {
  try {
    const {
      participants,
      accept,
      signature,
    } = req.body;

    let participant = participants.find(p => {
      const birthday = new Date(p.birthday);
      const now = new Date();
      const yearInMs = 1000 * 60 * 60 * 24 * 365;
      return (now - birthday) / yearInMs >= 18;
    });

    if (!participant) {
      return res.status(400).json({message: 'No adult participant found.'});
    }

    let dependents = participants.filter(p => p.birthday !== participant.birthday);

    let records = {
      firstName: participant.first_name,
      lastName: participant.last_name,
      email: participant.email.toLowerCase(),
      birthday: participant.birthday.slice(0, 10),
      signature,
    };

    if (dependents && dependents.length > 1) {
      records = [records];
      dependents.forEach(child => {
        records.push({
          firstName: child.first_name,
          lastName: child.last_name,
          email: child.email && child.email.toLowerCase() || participant.email.toLowerCase(),
          birthday: child.birthday.slice(0, 10),
          signature,
          parentFirstName: participant.firstName,
          parentLastName: participant.lastName,
          parentEmail: participant.email.toLowerCase()
        });
      });
    }

    try {
      const {result: [waiverId]} = await knex('waivers').insert(records);
    } catch (error) {
      if (error.code !== 'SQLITE_CONSTRAINT') {
        throw error;
      }
    }
    const waivers = await knex('waivers')
      .where({
        firstName: participant.first_name,
        lastName: participant.last_name,
        email: participant.email
      })
      .orWhere({
        parentFirstName: participant.first_name,
        parentLastName: participant.last_name,
        parentEmail: participant.email
      });

    for (let waiver of waivers) {
      if (waiver.waiverId) {
        waiver.accept = true;
        waiver.signature = true;
        await knex('checkin').insert({waiverId: waiver.waiverId});
        try {
          // noinspection ES6MissingAwait
          confirmationEmail.send(waiver);
        } catch (e) {
        }
      }
    }

    return res.status(201).json({waiver: waivers});
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

module.exports = {
  check,
  create
};
