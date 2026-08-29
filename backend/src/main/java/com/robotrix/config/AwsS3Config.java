package com.robotrix.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;

import java.net.URI;

@Configuration
@ConditionalOnProperty(name = "app.storage.type", havingValue = "s3")
public class AwsS3Config {

    @Value("${aws.s3.region:ap-south-1}")
    private String region;

    @Value("${aws.s3.access-key:}")
    private String accessKey;

    @Value("${aws.s3.secret-key:}")
    private String secretKey;

    @Value("${aws.s3.endpoint:}")
    private String endpoint;

    @Bean
    public S3Client s3Client() {
        S3ClientBuilder builder = S3Client.builder()
                .region(Region.of(region));

        if (StringUtils.hasText(accessKey) && StringUtils.hasText(secretKey)) {
            AwsCredentialsProvider credentialsProvider = StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKey.trim(), secretKey.trim())
            );
            builder.credentialsProvider(credentialsProvider);
        } else {
            builder.credentialsProvider(DefaultCredentialsProvider.create());
        }

        if (StringUtils.hasText(endpoint)) {
            builder.endpointOverride(URI.create(endpoint.trim()));
            builder.forcePathStyle(true);
        }

        return builder.build();
    }
}
