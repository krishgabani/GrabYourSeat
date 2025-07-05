export const getNewShowAddedHTML = (userName, movieTitle) => {
  return `
   <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; background: #ffffff; padding: 24px; border-radius: 10px; border: 1px solid #e0e0e0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    
    <h2 style="color: #333; font-weight: 600;">Hi ${userName},</h2>

    <p style="font-size: 16px; color: #444;">
      🎬 We've just added a new movie to our library:
    </p>

    <h3 style="color: #F84565; font-size: 20px; margin: 12px 0;">${movieTitle}</h3>

    <p style="font-size: 15px; color: #333;">
      Visit our website to check it out and book your seats early!
    </p>

    <p style="font-size: 14px; color: #777; margin-top: 32px;">
      Thanks,<br />
      <strong style="color: #F84565;">GrabYourSeat</strong> Team
    </p>
  </div>
`;
};
