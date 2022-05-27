const confirmationEmail = require('./confirmationEmail');
const knex = require('../knex');

const check = async (req, res) => {
  try {
    const {firstName, lastName, email} = req.query;

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

    console.log(waiver[0].waiverId)
    if (waiver && waiver[0].waiverId) {
      await knex('checkin').insert({ waiverId: waiver[0].waiverId });
    }

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
    children,
    parent: {
      firstName: parentFirstName,
      lastName: parentLastName,
      email: parentEmail
    }
  } = req.body;

  try {
    let records = {
      firstName,
      lastName,
      email: email.toLowerCase(),
      birthday: birthday.slice(0, 10),
      signature,
      parentFirstName,
      parentLastName,
      parentEmail: parentEmail ? parentEmail.toLowerCase() : parentEmail
    };

    if (children && children.length > 1) {
      records = [records];
      children.forEach(child => {
        records.push({
          firstName: child.firstName,
          lastName: child.lastName,
          email: child.email && child.email.toLowerCase() || email.toLowerCase(),
          birthday: child.birthday.slice(0, 10),
          signature,
          parentFirstName,
          parentLastName,
          parentEmail: parentEmail ? parentEmail.toLowerCase() : parentEmail
        });
      });
    }

    const { result: [waiverId] } =
      await knex('waivers')
        .insert(records);

    const [waiver] = await knex('waivers')
      .where({ waiverId });

    waiver.signature = true;

    if (waiver.waiverId) {
      await knex('checkin').insert({ waiverId: waiver.waiverId });
    }

    // noinspection ES6MissingAwait
    confirmationEmail.send(waiver);

    return res.status(201).json(waiver);
  } catch (error) {
    console.error(error);
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({message: 'User already exists!'});
    }
    return next(error);
  }
};

const fetchAll = async (req, res) => {
  try {
    const {email = '', search = '', limit = 100} = req.query;
    const query = knex
      .select(knex.raw(`*, datetime(created_at, '-5 hours') as created_at`))
      .from('waivers')
      .orderBy('waiverId', 'desc')
      .limit(limit);

    if (email !== '') {
      query.where('email', 'LIKE', `%${email}%`);
    }

    if (search !== '') {
      query
        .where('firstName', 'LIKE', `%${search}%`)
        .orWhere('lastName', 'LIKE', `%${search}%`)
        .orWhere('email', 'LIKE', `%${search}%`);
    }

    const waivers = await query;
    if (email !== '' && waivers && waivers[0].waiverId) {
      await knex('checkin').insert({waiverId: waivers[0].waiverId});
    }

    return res.json({waivers});
  } catch (error) {
    console.error(error);
    return res.status(500).json({error, message: error.message});
  }
};

const count = async (req, res) => {
  const { startDate = undefined } = req.query;

  let query = knex('waivers');

  if (startDate) {
    query
      .where('createdAt', '<', `date('${startDate}')`)
      .andWhere('createdAt', '>', `date('${startDate}', '+4 days')`)
  } else {
    query.where('createdAt', '>', 'date("now", "-4 days")');
  }

  query.count();

  const count = await query;
  return res.json({ count });
}

module.exports = {
  check,
  count,
  create,
  fetchAll
};
