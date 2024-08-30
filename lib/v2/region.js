const express = require('express');
const axios = require('axios');
const moment = require('moment-timezone');
const router = express.Router();

router.get('/:ip', async (req, res) => {
  const { ip } = req.params;

  try {
    const params = '?fields=status,message,countryCode,regionName,city,timezone';
    const { data } = await axios.get(`http://ip-api.com/json/${ip}${params}`);

    if (data.status === 'fail') {
      return res.status(400).json({ error: data.message });
    }

    const tzAbbr = moment().tz(data.timezone).format('z');

    res.json({
      city: data.city,
      state: data.regionName,
      timezone: tzAbbr,
      countryCode: data.countryCode
    });
  } catch (error) {
    console.error('Error fetching location and timezone data:', error);
    res.status(500).json({ error: 'Unable to fetch location and timezone data' });
  }
});

module.exports = router;