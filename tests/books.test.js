process.env.NODE_ENV = "test";
const express = require("express");
const app = require("../app");
const request = require("supertest");
const db = require("../db");


let book;

beforeEach(async() => {
    const bookData = await db.query(
        `INSERT INTO books
         (isbn, amazon_url, author, language, pages, publisher, title, year)
         VALUES
         ('0069115610', 'https://www.amazon.com/mybook', 'jake', 'english', 319, 'Princeton', 'My Book', 2019)
         RETURNING isbn, amazon_url, author, language, pages, publisher, title, year`
    );

    book = bookData.rows[0];
});

afterEach(async() => {
    await db.query('DELETE FROM books');
});

afterAll(async() => {
    await db.end();
});


describe("GET /books", () => {
    test("Does the get all books route return an array of all books?", async() => {
        const resp = await request(app).get("/books");
        expect(resp.statusCode).toBe(200);
    });
    test("Does an incorrect url throw an appropriate error?", async() => {
        const resp = await request(app).get("/book");
        expect(resp.statusCode).toBe(404);
        expect(resp.body.error.message).toEqual("Not Found");
    });
});

describe("GET /books/:isbn", () => {
    test("Does the get book by isbn route work correctly, given an existing book isbn?", async() => {
        const resp = await request(app).get("/books/0069115610");
        expect(resp.statusCode).toBe(200);
        expect(resp.body.book.author).toEqual('jake');
    });
    test("Does the get book by isbn route throw a 404 error when passed a non-existant book isbn?", async() => {
        const resp = await request(app).get("/books/9876");
        expect(resp.statusCode).toBe(404);
        expect(resp.body.error.message).toEqual("There is no book with an isbn 9876");
    });
});

describe("POST /books", () => {
    test("Does the route to create a new book return a new book, given a good request body?", async() => {
        const newBook = {
            isbn: '987654',
            amazon_url: 'https://www.amazon.com/newBook',
            author: 'tim',
            language: 'french',
            pages: 216,
            publisher: 'Harvard',
            title: 'New Book',
            year: 2016
        };
        const resp = await request(app).post("/books").send(newBook);
        expect(resp.statusCode).toBe(201);
        expect(resp.body.book.year).toBe(2016);
    });
    test("Does the JSON schema cause an error to be thrown, given an incorrect request body?", async() => {
        // "pages" should be a Number, not a string
        const newBook = {
            isbn: '987654',
            amazon_url: 'https://www.amazon.com/newBook',
            author: 'tim',
            language: 'french',
            pages: '216',
            publisher: 'Harvard',
            title: 'New Book',
            year: 2016
        };
        const resp = await request(app).post("/books").send(newBook);
        expect(resp.statusCode).toBe(400);
        expect(resp.body.error.message[0]).toEqual("instance.pages is not of a type(s) integer");
    });
});

describe("PUT /books/:isbn", () => {
    test("Does the PUT route update a book in the database, given a good request body?", async() => {
        const updatedBook = {
            isbn: '0069115610', 
            amazon_url: 'https://www.amazon.com/mybook', 
            author: 'jake west', 
            language: 'english, french', 
            pages: 319, 
            publisher: 'Princeton', 
            title: 'My Book', 
            year: 2019
        };
        const resp = await request(app).put("/books/0069115610").send(updatedBook);
        expect(resp.statusCode).toBe(200);
        const updatedResp = await request(app).get("/books/0069115610");
        expect(updatedResp.statusCode).toBe(200);
        expect(updatedResp.body.book.author).toEqual('jake west');
        expect(updatedResp.body.book.language).toEqual('english, french');
    });
    test("Does the PUT route throw a 404 if the book isbn is not of an actual book?", async() => {
        const updatedBook = {
            isbn: '345', 
            amazon_url: 'https://www.amazon.com/mybook', 
            author: 'jake west', 
            language: 'english, french', 
            pages: 319, 
            publisher: 'Princeton', 
            title: 'My Book', 
            year: 2019
        };
        const resp = await request(app).put("/books/345").send(updatedBook);
        expect(resp.statusCode).toBe(404);
        expect(resp.body.error.message).toEqual("There is no book with an isbn 345");
    });
});

describe("DELETE /books/:isbn", () => {
    test("Does the delete route delete a book from the database, given an existing isbn?", async() => {
        const deleteResp = await request(app).delete("/books/0069115610");
        expect(deleteResp.statusCode).toBe(200);
        expect(deleteResp.body.message).toEqual("Book deleted");
    });
    test("Does the delete route throw a 404 error if the given isbn does not match a book record?", async() => {
        const resp = await request(app).delete("/books/345");
        expect(resp.statusCode).toBe(404);
        expect(resp.body.error.message).toEqual("There is no book with an isbn 345");
    });
});