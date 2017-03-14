FROM redis

EXPOSE 11121

VOLUME ["/data"]

RUN mkdir -p /var/db/redis

COPY redis.conf /usr/local/etc/redis/redis.conf

CMD ["sh", "-c", "/usr/local/bin/redis-server /usr/local/etc/redis/redis.conf --slaveof $REDIS_NO_DISK_MASTER_PORT_11120_TCP_ADDR $REDIS_NO_DISK_MASTER_PORT_11120_TCP_PORT"]
