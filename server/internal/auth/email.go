package auth

import (
	"fmt"
	"log"
	"net/smtp"
	"os"

	"Geospatial-harmuz-watch/server/internal/config"
)

// sendEmail is a helper to dispatch emails using SMTP if configured,
// or fallback to stdout logging if not configured.
func sendEmail(to []string, subject, body string) error {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")
	from := os.Getenv("SMTP_FROM")

	if host == "" || port == "" || user == "" || pass == "" || from == "" {
		log.Printf("\n========== [MOCK EMAIL] ==========\nTo: %v\nSubject: %s\n\n%s\n==================================\n", to, subject, body)
		return nil
	}

	addr := fmt.Sprintf("%s:%s", host, port)
	auth := smtp.PlainAuth("", user, pass, host)

	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s", from, to[0], subject, body)

	err := smtp.SendMail(addr, auth, from, to, []byte(msg))
	if err != nil {
		log.Printf("[Email] Failed to send email to %v: %v", to, err)
		return err
	}

	log.Printf("[Email] Successfully sent email to %v", to)
	return nil
}

// SendAdminNotification sends an alert to the designated admin email
// when a new user registers and requires approval.
func SendAdminNotification(username, userEmail string) {
	subject := "HormuzWatch: New Operator Registration Pending Approval"
	body := fmt.Sprintf(
		"Hello Admin,\n\n"+
			"A new operator has registered for HormuzWatch and is awaiting your approval.\n\n"+
			"Username: %s\n"+
			"Email: %s\n\n"+
			"To approve this user, you can use the API or the admin dashboard.\n\n"+
			"HormuzWatch Automated System",
		username, userEmail)

	_ = sendEmail([]string{config.PrimaryAdminEmail}, subject, body)
}

// SendUserApprovalNotification sends an email to the user
// once an admin has granted them access to the platform.
func SendUserApprovalNotification(userEmail string) {
	subject := "HormuzWatch: Access Granted"
	body := "Hello,\n\n" +
		"Your request for operator access to the HormuzWatch platform has been GRANTED.\n\n" +
		"You may now log in to the command center to view live geospatial intelligence.\n\n" +
		"HormuzWatch Automated System"

	_ = sendEmail([]string{userEmail}, subject, body)
}
