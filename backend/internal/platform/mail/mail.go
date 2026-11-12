// Package mail sends transactional email (password resets).
package mail

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/smtp"
	"strings"
	"time"
)

// Message is a plain-text email.
type Message struct {
	To      string
	Subject string
	Body    string
}

// Sender delivers messages.
type Sender interface {
	Send(ctx context.Context, msg Message) error
}

// SMTPConfig configures an SMTP relay with STARTTLS.
type SMTPConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
}

// SMTPSender sends mail through an SMTP relay. It requires STARTTLS so
// credentials and reset links never travel in clear text.
type SMTPSender struct {
	cfg SMTPConfig
}

// NewSMTPSender builds an SMTP sender.
func NewSMTPSender(cfg SMTPConfig) *SMTPSender { return &SMTPSender{cfg: cfg} }

// Send implements Sender.
func (s *SMTPSender) Send(ctx context.Context, msg Message) error {
	if strings.ContainsAny(msg.To+msg.Subject, "\r\n") {
		return errors.New("mail: header injection attempt")
	}
	addr := net.JoinHostPort(s.cfg.Host, fmt.Sprint(s.cfg.Port))
	dialer := &net.Dialer{Timeout: 10 * time.Second}
	conn, err := dialer.DialContext(ctx, "tcp", addr)
	if err != nil {
		return fmt.Errorf("mail: dial: %w", err)
	}
	if deadline, ok := ctx.Deadline(); ok {
		_ = conn.SetDeadline(deadline)
	} else {
		_ = conn.SetDeadline(time.Now().Add(30 * time.Second))
	}
	c, err := smtp.NewClient(conn, s.cfg.Host)
	if err != nil {
		_ = conn.Close()
		return fmt.Errorf("mail: client: %w", err)
	}
	defer func() { _ = c.Close() }()

	if ok, _ := c.Extension("STARTTLS"); !ok {
		return errors.New("mail: server does not support STARTTLS")
	}
	if err := c.StartTLS(&tls.Config{ServerName: s.cfg.Host, MinVersion: tls.VersionTLS12}); err != nil {
		return fmt.Errorf("mail: starttls: %w", err)
	}
	if s.cfg.Username != "" {
		if err := c.Auth(smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)); err != nil {
			return fmt.Errorf("mail: auth: %w", err)
		}
	}
	if err := c.Mail(s.cfg.From); err != nil {
		return fmt.Errorf("mail: from: %w", err)
	}
	if err := c.Rcpt(msg.To); err != nil {
		return fmt.Errorf("mail: rcpt: %w", err)
	}
	w, err := c.Data()
	if err != nil {
		return fmt.Errorf("mail: data: %w", err)
	}
	body := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		s.cfg.From, msg.To, msg.Subject, strings.ReplaceAll(msg.Body, "\n", "\r\n"))
	if _, err := w.Write([]byte(body)); err != nil {
		return fmt.Errorf("mail: write: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("mail: close: %w", err)
	}
	return c.Quit()
}

// LogSender is for local development only: it logs the message (which
// contains reset links) instead of sending it. Never use it in production.
type LogSender struct{}

// Send implements Sender.
func (LogSender) Send(ctx context.Context, msg Message) error {
	slog.WarnContext(ctx, "DEV MAIL (not sent)", "to", msg.To, "subject", msg.Subject, "body", msg.Body)
	return nil
}
