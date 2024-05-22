const knex = require('../../knex');
const confirmationEmail = require('../confirmationEmail');

const check = async (req, res) => {
  try {
    const { firstName, lastName, email } = req.query;
    const result = await knex('waivers').where({ firstName, lastName, email });
    const waiver = result[0];

    if (waiver && waiver.waiverId) {
      await knex('checkin').insert({ waiverId: waiver.waiverId });
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
    res.status(500).json({ message: 'Failed to check waiver.', error });
  }
};

const create = async (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    birthday,
    signature,
    dependents = [],
  } = req.body;

  try {
    let records = {
      firstName,
      lastName,
      email: email.toLowerCase(),
      birthday: birthday.slice(0, 10),
      signature,
    };

    if (dependents && dependents.length > 1) {
      records = [records];
      dependents.forEach(child => {
        records.push({
          firstName: child.firstName,
          lastName: child.lastName,
          email: child.email && child.email.toLowerCase() || email.toLowerCase(),
          birthday: child.birthday.slice(0, 10),
          signature,
          parentFirstName: records[0].firstName,
          parentLastName: records[0].lastName,
          parentEmail: records[0].email.toLowerCase()
        });
      });
    }

    const { result: [waiverId] } = await knex('waivers').insert(records);
    const [waiver] = await knex('waivers').where({ waiverId });
    waiver.signature = true;

    if (waiver.waiverId) {
      await knex('checkin').insert({ waiverId: waiver.waiverId });
    }

    // noinspection ES6MissingAwait
    confirmationEmail.send(waiver);

    delete waiver.signature;
    return res.status(201).json(waiver);
  } catch (error) {
    console.error(error);
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({message: 'User already exists!'});
    }
    return next(error);
  }
};

module.exports = {
  check,
  create
};
