const transporter = require("../config/mailer");

async function sendEmail({to, subject, html}) {
    await transporter.sendMail({
        from: `"ApnaCart"<${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
    });
}

module.exports = {sendEmail};