// controllers/categoryController.js
const categoryModel = require('../models/categoryModel');
const { validationResult } = require('express-validator');

exports.getAllCategories = async (req, res, next) => {
    try {
        const categories = await categoryModel.getAllCategories();
        res.json(categories);
    } catch (err) {
        next(err);
    }
};

exports.getCategoryById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const category = await categoryModel.getCategoryById(id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json(category);
    } catch (err) {
        next(err);
    }
};

exports.createCategory = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { name, displayOrder } = req.body;
        const newCategory = await categoryModel.createCategory(name, displayOrder);
        res.status(201).json(newCategory);
    } catch (err) {
        next(err);
    }
};

exports.updateCategory = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { id } = req.params;
        const { name, displayOrder } = req.body;
        const updatedCategory = await categoryModel.updateCategory(id, name, displayOrder);
        res.json(updatedCategory);
    } catch (err) {
        next(err);
    }
};

exports.deleteCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const success = await categoryModel.deleteCategory(id);
        if (success) {
            res.json({ message: 'Category deleted' });
        } else {
            res.status(404).json({ message: 'Category not found' });
        }
    } catch (err) {
        next(err);
    }
};