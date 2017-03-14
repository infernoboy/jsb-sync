FROM redis

EXPOSE 11120

VOLUME ["/data"]

RUN mkdir -p /var/db/redis

COPY redis.conf /usr/local/etc/redis/redis.conf

CMD ["/usr/local/bin/redis-server", "/usr/local/etc/redis/redis.conf"]
