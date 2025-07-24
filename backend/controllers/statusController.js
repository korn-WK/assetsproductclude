const Status = require('../models/status');

exports.getAllStatuses = async (req, res) => {
  try {
    const statuses = await Status.getAllStatuses();
    res.json(statuses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
};

exports.getStatusById = async (req, res) => {
  try {
    const status = await Status.getStatusById(req.params.id);
    if (!status) return res.status(404).json({ error: 'Status not found' });
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
};

exports.createStatus = async (req, res) => {
  try {
    const { value, label, color } = req.body;
    if (!value || !label) return res.status(400).json({ error: 'Value and label are required' });
    const status = await Status.createStatus({ value, label, color });
    res.status(201).json(status);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create status' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { value, label, color } = req.body;
    if (!value || !label) return res.status(400).json({ error: 'Value and label are required' });
    const status = await Status.getStatusById(req.params.id);
    if (!status) return res.status(404).json({ error: 'Status not found' });
    await Status.updateStatus(req.params.id, { value, label, color });
    res.json({ id: req.params.id, value, label, color });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
};

exports.deleteStatus = async (req, res) => {
  try {
    const status = await Status.getStatusById(req.params.id);
    if (!status) return res.status(404).json({ error: 'Status not found' });
    await Status.deleteStatus(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete status' });
  }
}; 