package com.tripnote.common

import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ProblemDetail
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.HttpRequestMethodNotSupportedException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.MissingServletRequestParameterException
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

// Boot의 ProblemDetailsExceptionHandler(영문 detail)보다 먼저 적용되어야 한다.
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice
class ApiExceptionHandler {
    @ExceptionHandler(ApiException::class)
    fun handle(exception: ApiException): ResponseEntity<ProblemDetail> {
        val problem = ProblemDetail.forStatusAndDetail(exception.status, exception.message)
        exception.body?.let { problem.setProperty("current", it) }
        val builder = ResponseEntity.status(exception.status)
        exception.retryAfter?.let { builder.header(HttpHeaders.RETRY_AFTER, it.toSeconds().toString()) }
        return builder.body(problem)
    }

    @ExceptionHandler(
        MethodArgumentNotValidException::class,
        HttpMessageNotReadableException::class,
        MethodArgumentTypeMismatchException::class,
        MissingServletRequestParameterException::class,
    )
    fun invalid(exception: Exception): ProblemDetail {
        val problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "입력값을 확인해 주세요.")
        if (exception is MethodArgumentNotValidException) {
            problem.setProperty("fields", exception.bindingResult.fieldErrors.associate { it.field to (it.defaultMessage ?: "") })
        }
        return problem
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException::class)
    fun methodNotAllowed(exception: HttpRequestMethodNotSupportedException): ResponseEntity<ProblemDetail> {
        val builder = ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
        exception.headers.allow.takeIf { it.isNotEmpty() }?.let { builder.allow(*it.toTypedArray()) }
        return builder.body(ProblemDetail.forStatusAndDetail(HttpStatus.METHOD_NOT_ALLOWED, "지원하지 않는 요청이에요."))
    }
}
