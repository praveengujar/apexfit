output "cloud_run_url" {
  description = "The URL of the deployed Cloud Run API service"
  value       = google_cloud_run_v2_service.api.uri
}

output "cloud_sql_connection_name" {
  description = "The connection name of the Cloud SQL instance (project:region:instance)"
  value       = google_sql_database_instance.main.connection_name
}

output "redis_host" {
  description = "The IP address of the Redis instance"
  value       = google_redis_instance.cache.host
}

output "service_account_email" {
  description = "The email address of the Cloud Run service account"
  value       = google_service_account.cloud_run_sa.email
}
