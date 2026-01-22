import { Inngest } from 'inngest';
import sendEmail from '../configs/nodemailer.js';
import prisma from '../configs/db.js';
import { getBookingConfirmationHTML } from '../lib/emailTemplates/bookingConfirmation.js';
import { getReminderHTML } from '../lib/emailTemplates/reminder.js';
import { getNewShowAddedHTML } from '../lib/emailTemplates/newShowAdded.js';

// Create a client to send and receive events
export const inngest = new Inngest({ id: 'movie-ticket-booking' });

// Inngest function to save user data to a database
const syncUserCreation = inngest.createFunction(
  { id: 'sync-user-from-clerk' },
  { event: 'clerk/user.created' },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    const userData = {
      id: id,
      email: email_addresses[0].email_address,
      name: first_name + ' ' + last_name,
      image: image_url,
    };
    await prisma.user.create({ data: userData });
  }
);

// Inngest function to delete user from database
const syncUserDeletion = inngest.createFunction(
  { id: 'delete-user-from-clerk' },
  { event: 'clerk/user.deleted' },
  async ({ event }) => {
    const { id } = event.data;
    await prisma.user.delete({ where: { id } });
  }
);

// Inngest function to update user data in database
const syncUserUpdation = inngest.createFunction(
  { id: 'update-user-from-clerk' },
  { event: 'clerk/user.updated' },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    const userData = {
      email: email_addresses[0].email_address,
      name: first_name + ' ' + last_name,
      image: image_url,
    };
    await prisma.user.update({
      where: { id },
      data: userData,
    });
  }
);

// Inngest function to cancel booking and release seats of show after 10 minutes of booking created if payment is not made
const releaseSeatsAndDeleteBooking = inngest.createFunction(
  { id: 'release-seats-delete-booking' },
  { event: 'app/checkpayment' },
  async ({ event, step }) => {
    const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
    await step.sleepUntil('wait-for-10-minutes', tenMinutesLater);
    await step.run('check-payment-status', async () => {
      const bookingId = parseInt(event.data.bookingId);
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });

      // If payment is not made, release seats and delete booking
      if (!booking.isPaid) {

        // Delete Reserved Seats
        await prisma.seat.deleteMany({
          where: { bookingId: booking.id }
        });

        // Delete Booking
        await prisma.booking.delete({ where: { id: booking.id } });
      }
    });
  }
);

// Inngest Function to send email when user books a show
const sendBookingConfirmationEmail = inngest.createFunction(
  { id: 'send-booking-confirmation-email' },
  { event: 'app/show.booked' },
  async ({ event }) => {
    const { bookingId } = event.data;
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
      include: {
        show: {
          include: { movie: true },
        },
        user: true,
      },
    });

    await sendEmail({
      to: booking.user.email,
      subject: `🎉 Your Tickets for "${booking.show.movie.title}" are Confirmed!`,
      body: getBookingConfirmationHTML(booking),
    });
  }
);

// Inngest Function to reminders
const sendShowReminders = inngest.createFunction(
  { id: 'send-show-reminders' },
  { cron: '0 */8 * * *' }, // Every 8 hours
  async ({ step }) => {
    const now = new Date();
    const in8Hours = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const windowStart = new Date(in8Hours.getTime() - 10 * 60 * 1000);

    // Prepare reminder tasks
    const reminderTasks = await step.run('prepare-reminder-tasks', async () => {
      const shows = await prisma.show.findMany({
        where: {
          showDateTime: { gte: windowStart, lte: in8Hours },
        },
        include: { movie: true },
      });
      const tasks = [];
      for (const show of shows) {
        if (!show.movie || !show.occupiedSeats) continue;
        const userIds = [...new Set(Object.values(show.occupiedSeats))];
        if (userIds.length === 0) continue;

        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { name: true, email: true },
        });
        for (const user of users) {
          tasks.push({
            userEmail: user.email,
            userName: user.name,
            movieTitle: show.movie.title,
            showTime: show.showDateTime,
          });
        }
      }
      return tasks;
    });
    if (reminderTasks.length === 0) {
      return { sent: 0, message: 'No Reminder to send.' };
    }

    // Send Reminder Emails
    const results = await step.run('send-all-reminders', async () => {
      return await Promise.allSettled(
        reminderTasks.map((task) =>
          sendEmail({
            to: task.userEmail,
            subject: `⏰ It's almost time! "${task.movieTitle}" starts soon!"`,
            body: getReminderHTML(task),
          })
        )
      );
    });

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - sent;

    return {
      sent,
      failed,
      message: `Sent ${sent} reminder(s), ${failed} failed.`,
    };
  }
);

// Inngest Function to send notifications when a new show is added
const sendNewShowNotification = inngest.createFunction(
  { id: 'send-new-show-notifications' },
  { event: 'app/show.added' },
  async ({ event }) => {
    const { movieTitle } = event.data;

    const users = await prisma.user.findMany({
      select: { name: true, email: true },
    });
    await Promise.allSettled(
      users.map((user) =>
        sendEmail({
          to: user.email,
          subject: `🆕 Just Dropped: "${movieTitle}" is now showing!"`,
          body: getNewShowAddedHTML(user.name, movieTitle),
        })
      )
    );

    return {
      message: 'Notifications sent.',
    };
  }
);

// Export future Inngest functions
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
  sendShowReminders,
  sendNewShowNotification,
];
