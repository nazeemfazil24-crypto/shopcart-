-- SQL script to create database and tables for shop app

-- Create database (run in your SQL client)
CREATE DATABASE IF NOT EXISTS shop_app;

-- Switch to the database
USE shop_app;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(150) UNIQUE NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    password_hash VARCHAR(200) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    price FLOAT DEFAULT 0.0,
    cost FLOAT DEFAULT 0.0,
    image VARCHAR(400) DEFAULT ''
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    method VARCHAR(100) DEFAULT 'unknown',
    amount FLOAT DEFAULT 0.0,
    items VARCHAR(800) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);