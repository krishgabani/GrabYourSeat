export const getBookingConfirmationHTML = (booking) => {
  const showDate = new Date(booking.show.showDateTime).toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const showTime = new Date(booking.show.showDateTime).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).toUpperCase();

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; background: #ffffff; padding: 24px; border-radius: 10px; border: 1px solid #e0e0e0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <h2 style="color: #333; font-weight: 600;">Hey ${booking.user.name},</h2>
      <p style="font-size: 16px; color: #444;">
        🎉 Your booking for <strong style="color: #F84565;">${booking.show.movie.title}</strong> is <strong>confirmed</strong>!
      </p>
      <div style="margin: 24px 0; background-color: #f4f4f4; padding: 20px; border-radius: 8px;">
        <p style="margin: 0; font-size: 15px; color: #222;"><strong>🎬 Movie:</strong> ${booking.show.movie.title}</p>
        <p style="margin: 8px 0 0; font-size: 15px; color: #222;"><strong>📅 Date:</strong> ${showDate}</p>
        <p style="margin: 8px 0 0; font-size: 15px; color: #222;"><strong>⏰ Time:</strong> ${showTime}</p>
        <p style="margin: 8px 0 0; font-size: 15px; color: #222;"><strong>💺 Seats:</strong> ${booking.bookedSeats.join(', ')}</p>
      </div>
      <p style="font-size: 16px; color: #555;">We hope you have a fantastic experience! 🍿</p>
      <p style="font-size: 14px; color: #999; margin-top: 32px;">
        Thank you for choosing <strong style="color: #F84565;">GrabYourSeat</strong>!
      </p>
    </div>
  `;
};
