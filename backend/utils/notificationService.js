import { Notification } from "../models/notificationSchema.js";
import { User } from "../models/userSchema.js";
import { sendEmail } from "./sendEmail.js";

// Create notification and send email
export const notifyDoctor = async (doctorId, appointmentData, patientData) => {
  try {
    // Create notification in database
    const notification = await Notification.create({
      recipientId: doctorId,
      recipientType: "Doctor",
      type: "appointment_booking",
      title: "New Appointment Booking",
      message: `New appointment booked by ${patientData.fullName} for ${appointmentData.appointment_date} at ${appointmentData.appointment_time}`,
      data: {
        appointmentId: appointmentData._id,
        patientId: patientData._id,
        doctorId: doctorId,
        appointmentDate: appointmentData.appointment_date,
        appointmentTime: appointmentData.appointment_time,
        status: appointmentData.status,
      },
    });

    // Get doctor details
    const doctor = await User.findById(doctorId);
    if (!doctor) {
      console.error("Doctor not found for notification:", doctorId);
      return;
    }

    // Check if doctor has email notifications enabled
    if (doctor.emailNotificationsEnabled) {
      try {
        // Send email notification
        const emailMessage = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #3939d9f2, #271776ca); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🏥 Motion Clinic</h1>
              <p style="color: white; margin: 5px 0 0 0; font-size: 16px;">New Appointment Notification</p>
            </div>
            
            <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
              <h2 style="color: #3939d9f2; margin-bottom: 20px;">New Appointment Booking</h2>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3939d9f2;">
                <h3 style="color: #333; margin-top: 0;">Patient Information</h3>
                <p><strong>Name:</strong> ${patientData.fullName}</p>
                <p><strong>Email:</strong> ${patientData.email}</p>
                <p><strong>Phone:</strong> ${patientData.phone}</p>
                <p><strong>Gender:</strong> ${patientData.gender}</p>
                <p><strong>Age:</strong> ${calculateAge(patientData.dob)} years</p>
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #10b981;">
                <h3 style="color: #333; margin-top: 0;">Appointment Details</h3>
                <p><strong>Date:</strong> ${new Date(appointmentData.appointment_date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${appointmentData.appointment_time}</p>
                <p><strong>Department:</strong> ${appointmentData.department}</p>
                <p><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">${appointmentData.status}</span></p>
              </div>
              
              ${patientData.complain ? `
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ef4444;">
                <h3 style="color: #333; margin-top: 0;">Patient Complaint</h3>
                <p>${patientData.complain}</p>
              </div>
              ` : ''}
              
              ${patientData.medicalHistory ? `
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #8b5cf6;">
                <h3 style="color: #333; margin-top: 0;">Medical History</h3>
                <p>${patientData.medicalHistory}</p>
              </div>
              ` : ''}
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/doctor-dashboard" 
                   style="background: linear-gradient(140deg, #9083d5, #271776ca); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  View in Dashboard
                </a>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
                <p>This is an automated notification from Motion Clinic.</p>
                <p>If you have any questions, please contact the clinic directly.</p>
              </div>
            </div>
          </div>
        `;

        await sendEmail({
          email: doctor.email,
          subject: "New Appointment Booking - Motion Clinic",
          message: emailMessage,
        });

        // Update notification as email sent
        await Notification.findByIdAndUpdate(notification._id, {
          isEmailSent: true,
          emailSentAt: new Date(),
        });

        console.log(`✅ Email notification sent to doctor: ${doctor.email}`);
      } catch (emailError) {
        console.error("❌ Error sending email notification:", emailError);
        // Don't fail the appointment creation if email fails
      }
    }

    console.log(`✅ Notification created for doctor: ${doctorId}`);
    return notification;
  } catch (error) {
    console.error("❌ Error creating notification:", error);
    // Don't fail the appointment creation if notification fails
  }
};

// Helper function to calculate age
const calculateAge = (dob) => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Get notifications for a user
export const getUserNotifications = async (userId, limit = 50) => {
  try {
    const notifications = await Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('data.appointmentId')
      .populate('data.patientId', 'fullName email phone')
      .populate('data.doctorId', 'fullName email doctorDepartment');
    
    return notifications;
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    return [];
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { isRead: true },
      { new: true }
    );
    return notification;
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
    return null;
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (userId) => {
  try {
    await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { isRead: true }
    );
    return true;
  } catch (error) {
    console.error("❌ Error marking all notifications as read:", error);
    return false;
  }
};

// Get unread notification count
export const getUnreadNotificationCount = async (userId) => {
  try {
    const count = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });
    return count;
  } catch (error) {
    console.error("❌ Error getting unread notification count:", error);
    return 0;
  }
}; 