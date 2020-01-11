const config = require('config');
const qrcode = require('qrcode');
const nodemailer = require('nodemailer');

const transport = nodemailer.createTransport(config.get('smtp'));

const getTemplate = (createdAt, dataUrl) => {
  return `
    <h2>Convention Foam Fighting</h2>
    <h3>Waiver Accepted on ${createdAt}</h3>
    
    <img src="${dataUrl}" width="500" height="500" alt="qr code">
    
    <p>
      The QR Code above is your confirmation that you've accepted the terms and agreements. 
      Please present this QRCode in the future. This will save you time from having to fill 
      out the waiver again. Have a great day!
    </p>
  `
};

const send = async waiver => {
  const dataUrl = await qrcode.toDataURL(JSON.stringify(waiver));
  const parentEmail = waiver.parentEmail ? `, ${waiver.parentEmail}` : '';

  console.log('getTemplate:', getTemplate(waiver.createdAt, dataUrl));

  return transport.sendMail({
    from: 'Convention Foam Fighting <info@conventionfoamfighting.com>',
    to: `${waiver.email}${parentEmail}`,
    subject: 'Confirmation of Waiver Acceptance',
    html: getTemplate(waiver.createdAt, dataUrl)
  }, console.error);
};

module.exports = {
  send
};

// send({
//   firstName: 'Brian',
//   lastName: 'Jemilo',
//   email: 'jemiloii@gmail.com',
//   birthday: '1991-05-19',
//   signature: true,
//   parentEmail: null,
//   parentFirstName: null,
//   parentLastName: null,
//   createdAt: new Date()
// });

// transport.verify((e, s) => {
//   console.log('e', e);
//   console.log('s', s);
// });