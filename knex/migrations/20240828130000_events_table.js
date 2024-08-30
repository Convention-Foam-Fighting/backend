exports.up = (knex) =>
  knex.schema.createTable('events', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.string('timezone').notNullable();
    table.string('city');
    table.string('state');
    table.string('logo_url');
    table.timestamps(true, true);
  });

exports.down = (knex) =>
  knex.schema.dropTable('events');