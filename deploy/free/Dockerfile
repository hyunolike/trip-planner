# Build runs on Render, with no connection to DB/cache and no embedded secrets.
FROM eclipse-temurin:25-jdk-noble@sha256:acfffa436ed09ee497b10c614485beb4dc8628cb740b4ea7daf395113d7ff698 AS build
WORKDIR /source
COPY apps/api/ ./
RUN ./gradlew --no-daemon bootJar -x test
FROM eclipse-temurin:25-jre-noble@sha256:d9a39a23634650173f1e2bbc176227af9728587ecf0f4b62d53e9355cd7a19ab
WORKDIR /opt/tripnote
COPY --from=build /source/build/libs/tripnote-api-0.1.0.jar api.jar
COPY deploy/free/application-free.yml /opt/config/application-free.yml
USER 10001:10001
ENV JAVA_TOOL_OPTIONS="-Xms64m -Xmx192m -XX:+UseSerialGC -XX:ActiveProcessorCount=1 -XX:MaxMetaspaceSize=192m -XX:ReservedCodeCacheSize=32m -XX:MaxDirectMemorySize=16m -Xss512k -XX:+ExitOnOutOfMemoryError -XX:TieredStopAtLevel=1"
ENV SPRING_CONFIG_ADDITIONAL_LOCATION=file:/opt/config/
ENV SPRING_PROFILES_ACTIVE=free
EXPOSE 10000
ENTRYPOINT ["java", "-jar", "/opt/tripnote/api.jar"]
