# Robotrix Server Deployment & Operations Guide

This guide contains the server specifications, file paths, build/deploy scripts, service management commands, and database access instructions for the AWS Lightsail production server.

---

## Server Specifications
- **Public IP:** `13.206.205.222`
- **SSH User:** `ubuntu`
- **SSH Private Key Path (Local):** `/home/ssb/Desktop/robo-aws/LightsailDefaultKey-ap-south-1.pem`
- **SSH Command:**
  ```bash
  ssh -i /home/ssb/Desktop/robo-aws/LightsailDefaultKey-ap-south-1.pem ubuntu@13.206.205.222
  ```

---

## 1. Local Build & Deploy Commands

Run these commands from the project root (`/home/ssb/Desktop/Robotrix`).

### A. Frontend (React + Vite)

1. **Build the production bundle:**
   ```bash
   npm run build
   ```
2. **Compress the output directory:**
   ```bash
   tar -czf dist.tar.gz -C dist .
   ```
3. **Upload the archive to the server:**
   ```bash
   scp -i /home/ssb/Desktop/robo-aws/LightsailDefaultKey-ap-south-1.pem dist.tar.gz ubuntu@13.206.205.222:/home/ubuntu/
   ```
4. **Deploy on the server:**
   ```bash
   ssh -i /home/ssb/Desktop/robo-aws/LightsailDefaultKey-ap-south-1.pem ubuntu@13.206.205.222 "sudo rm -rf /var/www/robotrix/* && sudo tar -xzf /home/ubuntu/dist.tar.gz -C /var/www/robotrix && sudo chown -R www-data:www-data /var/www/robotrix && sudo chmod -R 755 /var/www/robotrix"
   ```

---

### B. Backend (Spring Boot / Java 21)

1. **Build the JAR file:**
   ```bash
   cd /home/ssb/Desktop/Robotrix/backend
   ./gradlew bootJar -x test
   ```
2. **Upload the JAR file:**
   ```bash
   scp -i /home/ssb/Desktop/robo-aws/LightsailDefaultKey-ap-south-1.pem backend/build/libs/robotrix-backend.jar ubuntu@13.206.205.222:/home/ubuntu/
   ```
3. **Deploy on the server & restart service:**
   ```bash
   ssh -i /home/ssb/Desktop/robo-aws/LightsailDefaultKey-ap-south-1.pem ubuntu@13.206.205.222 "mkdir -p /home/ubuntu/robotrix/backend && mv /home/ubuntu/robotrix-backend.jar /home/ubuntu/robotrix/backend/ && sudo systemctl restart robotrix-backend"
   ```

---

## 2. Service Management (On the Server)

SSH into the server (`ubuntu@13.206.205.222`):

### A. Backend Daemon Service (`systemd`)
The backend service (`/etc/systemd/system/robotrix-backend.service`) runs in production mode with AWS S3 enabled:
```ini
Environment="STORAGE_TYPE=s3"
```
- **Start Backend:**
  ```bash
  sudo systemctl start robotrix-backend
  ```
- **Stop Backend:**
  ```bash
  sudo systemctl stop robotrix-backend
  ```
- **Restart Backend:**
  ```bash
  sudo systemctl restart robotrix-backend
  ```
- **Check Status:**
  ```bash
  sudo systemctl status robotrix-backend
  ```
- **View Live Logs:**
  ```bash
  sudo journalctl -u robotrix-backend -f
  ```
- **View Last 100 Logs:**
  ```bash
  sudo journalctl -u robotrix-backend -n 100 --no-pager
  ```

---

## 3. Storage Environments (Local vs. S3)

- **Local Development (`STORAGE_TYPE=local` - Default)**:
  Images are saved to `./uploads/tenants/<tenantId>/plans/<planId>/<imageType>`. No AWS keys or internet required.
- **Production Server (`STORAGE_TYPE=s3`)**:
  Images are stored in AWS S3 bucket: `robotrix-prod-image-559947225352-ap-south-1-an`.

### B. Nginx Web Server
- **Restart Nginx:**
  ```bash
  sudo systemctl restart nginx
  ```
- **Test Configuration Syntax:**
  ```bash
  sudo nginx -t
  ```
- **View Nginx Error Logs:**
  ```bash
  sudo tail -f /var/log/nginx/error.log
  ```

---

## 3. Database Access & Queries (On the Server)

- **Database Name:** `robotrix_db`
- **Username:** `postgres`
- **Password:** `Robotrix1@3$`

**Connect to the Database:**
```bash
sudo -u postgres psql -d robotrix_db
```
