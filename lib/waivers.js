const confirmationEmail = require('./confirmationEmail');
const knex = require('../knex');

const check = async (req, res) => {
  const { firstName, lastName, email } = req.query;

  const waiver =
    await knex('waivers')
      .where({
        firstName,
        lastName,
        email
      });

  if (waiver.length > 0) {
    waiver[0].parent = {
      firstName: waiver[0].parentFirstName,
      lastName: waiver[0].parentLastName,
      email: waiver[0].parentEmail
    };
  }

  res.json(waiver);
};

const create = async (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    birthday,
    signature,
    parent: {
      firsName: parentFirstName,
      lastName: parentLastName,
      email: parentEmail
    }
  } = req.body;

  try {
    const { result: [waiverId] } =
      await knex('waivers')
        .insert({
          firstName,
          lastName,
          email: email.toLowerCase(),
          birthday: birthday.slice(0, 10),
          signature,
          parentFirstName,
          parentLastName,
          parentEmail: parentEmail ? parentEmail.toLowerCase() : parentEmail
        });

    const [waiver] = await knex('waivers')
      .where({ waiverId });

    waiver.signature = true;

    // noinspection ES6MissingAwait
    confirmationEmail.send(waiver);
    return res.status(201).json(waiver);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({message: 'User already exists!'});
    }
    return next(error);
  }
};

const fetchAll = async (req, res) => {
  const { search = '' } = req.query;
  const query = knex('waivers')
    .orderBy('waiverId', 'desc');

  if (search !== '') {
    query
      .where('firstName', 'LIKE', `%${search}%`)
      .orWhere('lastName', 'LIKE', `%${search}%`)
      .orWhere('email', 'LIKE', `%${search}%`);
  }

  const waivers = await query;
  return res.json({ waivers });
};

module.exports = {
  check,
  create,
  fetchAll
};
