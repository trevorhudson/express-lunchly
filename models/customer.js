"use strict";

/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
  }

  /** find all customers.
   * Returns array of Customer instances.
  */

  static async all() {
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           ORDER BY last_name, first_name`,
    );
    return results.rows.map(c => new Customer(c));
  }

  /** search for customers based on first name or last name.
   * Returns all matching
   * customers as an array of Customer instances.
   */

  static async search(name) {
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           WHERE concat( first_name, ' ', last_name ) ILIKE $1
           ORDER BY last_name, first_name`,
      [`%${name}%`]
    );

    return results.rows.map(c => new Customer(c));
  }

  /** get a customer by ID.
   * Returns a Customer instance.
  */

  static async get(id) {
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           WHERE id = $1`,
      [id],
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }


  /** Get full name of customer.
   * Returns {full name} of customer from {firstName} {lastName}
   */

  fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  /** get all reservations for this customer.
   * Returns array of Reservation instances.
  */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** save this customer.
   * Adds a new customer to database, or updates a current customer.
  */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes],
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers
             SET first_name=$1,
                 last_name=$2,
                 phone=$3,
                 notes=$4
             WHERE id = $5`, [
        this.firstName,
        this.lastName,
        this.phone,
        this.notes,
        this.id,
      ],
      );
    }
  }

  /** get top ten best customers.
   * Returns array of Customer instances.
   */
  static async bestCustomers() {
    const results = await db.query(
      `SELECT c.id,
              c.first_name AS "firstName",
              c.last_name  AS "lastName",
              c.phone,
              c.notes,
              count(r.id) AS "reservations"
      FROM customers AS c
        JOIN reservations AS r
        ON c.id = r.customer_id
      GROUP BY c.id
      ORDER BY count(r.id) DESC, c.last_name, c.first_name
      LIMIT 10;`);
    return results.rows.map(c => new Customer(c));
  }
}

module.exports = Customer;
