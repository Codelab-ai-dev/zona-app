# syntax=docker/dockerfile:1
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN for cmd in api seed createadmin; do \
      CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/$cmd ./cmd/$cmd || exit 1; \
    done \
 # File storage mount points, owned by the nonroot user so fresh named
 # volumes inherit writable permissions.
 && mkdir -p /out/data/public /out/data/private

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/api /api
# seed: demo data (refuses production). createadmin: bootstrap a super admin.
COPY --from=build /out/seed /seed
COPY --from=build /out/createadmin /createadmin
COPY --from=build --chown=65532:65532 /out/data /data
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/api"]
