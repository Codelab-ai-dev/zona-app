package storage

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3Store implements ObjectStore using AWS SDK v2.
type S3Store struct {
	client *s3.Client
	bucket string
	ttl    time.Duration
}

// NewS3Store builds an S3 store with the given config.
func NewS3Store(cfg Config) (*S3Store, error) {
	// Validate required config
	if cfg.Bucket == "" {
		return nil, fmt.Errorf("storage: bucket is required")
	}
	if cfg.Region == "" {
		return nil, fmt.Errorf("storage: region is required")
	}
	if cfg.AccessKeyID == "" {
		return nil, fmt.Errorf("storage: AccessKeyID is required")
	}
	if cfg.SecretAccessKey == "" {
		return nil, fmt.Errorf("storage: SecretAccessKey is required")
	}

	resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		if cfg.Endpoint != "" {
			return aws.Endpoint{
				URL:           cfg.Endpoint,
				SigningRegion: cfg.Region,
			}, nil
		}
		return aws.Endpoint{}, &aws.EndpointNotFoundError{}
	})

	sdkCfg := aws.NewConfig()
	sdkCfg.Region = cfg.Region
	sdkCfg.Credentials = credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretAccessKey, "")
	sdkCfg.EndpointResolverWithOptions = resolver

	client := s3.NewFromConfig(*sdkCfg, func(o *s3.Options) {
		if cfg.Endpoint != "" {
			// Use path-style addressing for custom endpoints (Wasabi, Minio, R2, etc.)
			o.UsePathStyle = true
		}
	})
	return &S3Store{
		client: client,
		bucket: cfg.Bucket,
		ttl:    cfg.PresignTTL,
	}, nil
}

// Put uploads from reader to the key (streams, doesn't buffer).
func (s *S3Store) Put(ctx context.Context, key string, reader io.Reader, size int64, contentType string) (etag string, err error) {
	input := &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        reader,
		ContentType: aws.String(contentType),
	}
	result, err := s.client.PutObject(ctx, input)
	if err != nil {
		return "", fmt.Errorf("put object: %w", err)
	}
	if result.ETag != nil {
		etag = *result.ETag
	}
	return etag, nil
}

// Delete removes the key.
func (s *S3Store) Delete(ctx context.Context, key string) error {
	input := &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}
	_, err := s.client.DeleteObject(ctx, input)
	if err != nil {
		return fmt.Errorf("delete object: %w", err)
	}
	return nil
}

// List returns objects under the prefix.
func (s *S3Store) List(ctx context.Context, prefix string) ([]Object, error) {
	input := &s3.ListObjectsV2Input{
		Bucket:  aws.String(s.bucket),
		Prefix:  aws.String(prefix),
		MaxKeys: aws.Int32(1000),
	}
	paginator := s3.NewListObjectsV2Paginator(s.client, input)

	var objects []Object
	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return nil, fmt.Errorf("list objects: %w", err)
		}
		for _, item := range page.Contents {
			obj := Object{
				Key:       *item.Key,
				Size:      *item.Size,
				CreatedAt: *item.LastModified,
			}
			if item.ETag != nil {
				obj.ETag = *item.ETag
			}
			objects = append(objects, obj)
		}
	}
	return objects, nil
}

// PresignGet returns a presigned URL for reading the object.
func (s *S3Store) PresignGet(ctx context.Context, key string, ttl time.Duration) (string, error) {
	input := &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}
	presignClient := s3.NewPresignClient(s.client)
	result, err := presignClient.PresignGetObject(ctx, input, func(opts *s3.PresignOptions) {
		opts.Expires = ttl
	})
	if err != nil {
		return "", fmt.Errorf("presign get: %w", err)
	}
	return result.URL, nil
}
