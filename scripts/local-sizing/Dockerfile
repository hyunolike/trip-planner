FROM eclipse-temurin:25-jdk-noble AS jdk
FROM valkey/valkey:9.1 AS valkey
FROM postgis/postgis:18-3.6
RUN apt-get update && apt-get install -y --no-install-recommends python3 libstdc++6 libssl3t64 zlib1g ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=jdk /opt/java/openjdk /opt/java/openjdk
COPY --from=valkey /usr/local/bin/valkey-server /usr/local/bin/valkey-server
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH=/opt/java/openjdk/bin:$PATH
COPY app.jar /bench/app.jar
RUN mkdir -p /bench/lib && cd /bench/lib && jar xf /bench/app.jar BOOT-INF/lib && java -version && valkey-server --version
COPY HashPassword.java benchmark.py process_probe.py /bench/
ENTRYPOINT ["python3", "-u", "/bench/benchmark.py"]
