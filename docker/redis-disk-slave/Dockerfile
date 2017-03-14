FROM redis

EXPOSE 11141

VOLUME ["/data"]

RUN mkdir -p /var/db/redis

COPY redis.conf /usr/local/etc/redis/redis.conf

CMD ["sh", "-c", "/usr/local/bin/redis-server /usr/local/etc/redis/redis.conf --slaveof $REDIS_DISK_MASTER_PORT_11140_TCP_ADDR $REDIS_DISK_MASTER_PORT_11140_TCP_PORT"]
