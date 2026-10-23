package com.shoppingagent.auth;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Slf4j
@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    /**
     * Gửi Email chứa mã OTP 6 chữ số với giao diện HTML thương hiệu chuyên nghiệp.
     * Có cơ chế fallback: Nếu chưa cấu hình App Password hoặc gặp lỗi mạng trong lúc dev,
     * hệ thống sẽ in trực tiếp OTP ra console log để developer kiểm thử ngay lập tức.
     */
    public boolean sendOtpEmail(String toEmail, String otp, String purpose) {
        log.info("==================================================================");
        log.info("[OTP NOTIFICATION] To: {} | Purpose: {} | OTP CODE: >>> {} <<<", toEmail, purpose, otp);
        log.info("==================================================================");

        if (mailSender == null || fromEmail == null || fromEmail.isBlank()) {
            log.warn("[EmailService] Chưa cấu hình spring.mail.username. Chế độ DEV: Sử dụng mã OTP hiển thị ở log phía trên.");
            return true;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());

            helper.setFrom(fromEmail, "ShoppingAgent AI");
            helper.setTo(toEmail);
            helper.setSubject("[ShoppingAgent AI] " + purpose + " - Mã xác thực của bạn: " + otp);

            String htmlContent = buildOtpHtmlTemplate(otp, purpose);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("[EmailService] Đã gửi thành công email OTP tới: {}", toEmail);
            return true;
        } catch (Exception e) {
            log.error("[EmailService] Không thể gửi email tới {}: {}. (Dùng mã OTP trong log để kiểm thử)", toEmail, e.getMessage());
            return true; // Không block quy trình kiểm thử local
        }
    }

    private String buildOtpHtmlTemplate(String otp, String purpose) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FDFBF7; margin: 0; padding: 24px; color: #1E1E1E; }
                    .card { max-width: 500px; margin: 0 auto; background: #FFFFFF; border: 2px solid #1E1E1E; border-radius: 20px; box-shadow: 4px 4px 0px #1E1E1E; overflow: hidden; }
                    .header { background: #FFD15C; padding: 24px; text-align: center; border-bottom: 2px solid #1E1E1E; }
                    .header h1 { margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
                    .body { padding: 32px 24px; text-align: center; }
                    .otp-box { display: inline-block; background: #F4F1EA; border: 2px solid #1E1E1E; border-radius: 14px; padding: 14px 28px; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #1E1E1E; margin: 20px 0; box-shadow: 2px 2px 0px #1E1E1E; }
                    .note { font-size: 13px; color: #666; line-height: 1.6; margin-top: 16px; }
                    .footer { padding: 16px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #EFEAE1; background: #FAF7F0; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="header">
                        <h1>🤖 ShoppingAgent AI</h1>
                    </div>
                    <div class="body">
                        <p style="font-size: 15px; font-weight: 700; margin: 0;">%s</p>
                        <p style="font-size: 13px; color: #555; margin-top: 6px;">Vui lòng nhập mã số xác thực gồm 6 chữ số dưới đây để tiếp tục:</p>
                        <div class="otp-box">%s</div>
                        <p class="note">
                            ⏰ Mã này có hiệu lực trong vòng <strong>5 phút</strong>.<br>
                            🔒 Vì lý do an toàn, vui lòng tuyệt đối <strong>không chia sẻ</strong> mã này cho bất kỳ ai.
                        </p>
                    </div>
                    <div class="footer">
                        © 2026 ShoppingAgent AI System. Tin nhắn bảo mật tự động, vui lòng không phản hồi.
                    </div>
                </div>
            </body>
            </html>
            """.formatted(purpose, otp);
    }
}
