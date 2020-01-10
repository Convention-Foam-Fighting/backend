exports.up = knex =>
  knex.schema
    .createTable('waivers', table => {
      table.increments('waiver_id').primary();
      table.string('first_name');
      table.string('last_name');
      table.string('email');
      table.string('birthday');
      table.text('signature');
      table.string('parent_first_name');
      table.string('parent_last_name');
      table.string('parent_email');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['first_name', 'last_name', 'email']);
    });

exports.down = knex =>
  knex.schema
    .dropTable('waivers');
