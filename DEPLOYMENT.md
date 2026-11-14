# Deployment notes

Live architecture: CloudFront serves the React build from S3 at the default
path, and routes `/api/*` to the Dockerized backend on EC2. One domain, one
HTTPS cert (CloudFront's default), so the browser never deals with CORS or
mixed-content issues.

```
Browser --> CloudFront (HTTPS) --+--> S3 (private, OAC-only): React build
                                  +--> /api/* --> EC2 (Docker) --> RDS Postgres
```

## Live resources (us-east-1, account 324404179200)

| Resource | ID / address |
|---|---|
| CloudFront domain | `dv8o5kikxmtnv.cloudfront.net` |
| CloudFront distribution ID | `E2AM0EO4HIFIDP` |
| S3 bucket (frontend build) | `expense-tracker-frontend-324404179200` |
| EC2 instance | `i-00ec7418fc2a124c2` |
| EC2 Elastic IP | `100.27.66.233` (fixed - survives stop/start) |
| EC2 public DNS (used as CloudFront origin) | `ec2-100-27-66-233.compute-1.amazonaws.com` |
| RDS instance | `expense-tracker-db` (private, only reachable from the EC2 security group) |
| SSH key | `~/Projects/aws.et/expense-tracker-key.pem` (user: `ubuntu`) |
| EC2 security group | `sg-06e71caeb1c03f16a` - allows SSH/5001 from your current IP, plus 5001 from AWS's CloudFront prefix list (`pl-3b927c52`) |

**Your IP changes over time** (home/ISP dynamic IP) - if SSH or direct `:5001`
access stops working, update the security group:
```
aws ec2 authorize-security-group-ingress --region us-east-1 --group-id sg-06e71caeb1c03f16a \
  --ip-permissions "IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=<your-ip>/32}]"
```
(and revoke the old entry the same way, with `revoke-security-group-ingress`.)

## Redeploy the backend

```
ssh -i ~/Projects/aws.et/expense-tracker-key.pem ubuntu@100.27.66.233
cd ~/expense-tracker
git pull
sudo docker compose -f docker-compose.prod.yml up -d --build
```

Migrations (only when a new one's been added):
```
sudo docker compose -f docker-compose.prod.yml exec backend npm run migrate up
```

## Redeploy the frontend

```
cd frontend
npm run build
aws s3 sync dist/ s3://expense-tracker-frontend-324404179200/ --delete
aws cloudfront create-invalidation --distribution-id E2AM0EO4HIFIDP --paths "/*"
```

The `create-invalidation` step matters - CloudFront caches aggressively, so
without it you'll keep seeing the old build for a while.

## Known gaps / next steps

- No custom domain yet - using CloudFront's own `.cloudfront.net` address.
- EC2-to-CloudFront hop is plain HTTP (`http-only` origin protocol) - fine
  since the browser only ever sees HTTPS, but not end-to-end encrypted.
- `backend/.env` on the EC2 box holds the real RDS credentials and JWT
  secret - never committed, only exists on that instance's disk.
- RDS and EC2 both bill while running. Stop EC2 with
  `aws ec2 stop-instances --instance-ids i-00ec7418fc2a124c2` when not in
  use - the Elastic IP stays reserved (and keeps billing a small amount)
  until released, but the instance itself stops billing for compute.
