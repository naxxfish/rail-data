FROM rabbitmq:alpine
ENV RABBITMQ_DEFAULT_USER=nr-data
ENV RABBITMQ_DEFAULT_PASS=nr-data
RUN bash -c "rabbitmq-plugins enable rabbitmq_stomp && rabbitmq-plugins enable rabbitmq_management "
EXPOSE 61613
EXPOSE 15672
