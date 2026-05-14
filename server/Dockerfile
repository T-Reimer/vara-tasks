FROM golang:1.26-alpine AS build

WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/vara-server ./main.go

FROM gcr.io/distroless/static-debian12

WORKDIR /app
COPY --from=build /out/vara-server /app/vara-server

EXPOSE 8080
ENV PORT=8080
ENV DATA_DIR=/app/data
ENV STATIC_DIR=/app/dist
VOLUME ["/app/data"]

ENTRYPOINT ["/app/vara-server"]
